"""
Windows-specific Asyncio Proactor patches for known CPython bugs (gh-83413, gh-100055, gh-93821).
Prevents:
1. 'ValueError: I/O operation on closed pipe' from crashing in
   BaseSubprocessTransport.__del__ and _ProactorBasePipeTransport.__repr__ / __del__
   during garbage collection or teardown of subprocess transports on Windows.
2. '[WinError 64] The specified network name is no longer available' (ERROR_NETNAME_DELETED /
   ERROR_CONNECTION_ABORTED) from closing the listening server socket in BaseProactorEventLoop._start_serving
   when a client drops or resets a TCP connection during accept (CPython gh-93821).
3. 'Task exception was never retrieved' in IocpProactor.accept.accept_coro on Windows client aborts.
"""

import sys
import warnings


def patch_windows_asyncio() -> None:
    """Apply safety patches to asyncio on Windows to prevent closed pipe and accept crash exceptions."""
    if sys.platform != "win32":
        return

    import asyncio
    import socket as _socket
    import struct as _struct
    from asyncio import base_subprocess, proactor_events

    # 1. Ensure WindowsProactorEventLoopPolicy is active
    try:
        current_policy = asyncio.get_event_loop_policy()
        if not isinstance(current_policy, asyncio.WindowsProactorEventLoopPolicy):
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

    # 2. Patch _ProactorBasePipeTransport.__repr__
    # CPython bug: if the underlying Windows PipeHandle is closed (_handle is None),
    # self._sock.fileno() raises ValueError("I/O operation on closed pipe").
    _orig_pipe_repr = proactor_events._ProactorBasePipeTransport.__repr__

    def _safe_pipe_repr(self):
        try:
            return _orig_pipe_repr(self)
        except (ValueError, OSError):
            return f"<{self.__class__.__name__} closed>"

    proactor_events._ProactorBasePipeTransport.__repr__ = _safe_pipe_repr

    # 3. Patch _ProactorBasePipeTransport.__del__
    # Safely handle closing/destruction without unhandled ValueError or RuntimeError
    _orig_pipe_del = proactor_events._ProactorBasePipeTransport.__del__

    def _safe_pipe_del(self, _warn=warnings.warn):
        try:
            _orig_pipe_del(self, _warn)
        except (ValueError, OSError, RuntimeError):
            pass

    proactor_events._ProactorBasePipeTransport.__del__ = _safe_pipe_del

    # 4. Patch BaseSubprocessTransport.__del__
    # Safely handle closing/destruction without unhandled ValueError or RuntimeError
    _orig_subproc_del = base_subprocess.BaseSubprocessTransport.__del__

    def _safe_subproc_del(self, _warn=warnings.warn):
        try:
            _orig_subproc_del(self, _warn)
        except (ValueError, OSError, RuntimeError):
            pass

    base_subprocess.BaseSubprocessTransport.__del__ = _safe_subproc_del

    # 5. Patch BaseProactorEventLoop._start_serving (CPython gh-93821)
    # When a client resets/aborts a connection before accept completes (e.g. WinError 64
    # ERROR_NETNAME_DELETED or WinError 1236 ERROR_CONNECTION_ABORTED), CPython's loop()
    # would catch OSError and close the *server listening socket* (sock.close()),
    # completely stopping the server from accepting any future connections.
    _orig_start_serving = proactor_events.BaseProactorEventLoop._start_serving

    def _safe_start_serving(
        self,
        protocol_factory,
        sock,
        sslcontext=None,
        server=None,
        backlog=100,
        ssl_handshake_timeout=None,
        ssl_shutdown_timeout=None,
    ):
        def loop(f=None):
            try:
                if f is not None:
                    try:
                        conn, addr = f.result()
                    except OSError:
                        # Client disconnected/aborted before accept completed; keep listener open
                        if not self.is_closed() and sock.fileno() != -1:
                            f = self._proactor.accept(sock)
                            self._accept_futures[sock.fileno()] = f
                            f.add_done_callback(loop)
                        return

                    protocol = protocol_factory()
                    if sslcontext is not None:
                        self._make_ssl_transport(
                            conn,
                            protocol,
                            sslcontext,
                            server_side=True,
                            extra={"peername": addr},
                            server=server,
                            ssl_handshake_timeout=ssl_handshake_timeout,
                            ssl_shutdown_timeout=ssl_shutdown_timeout,
                        )
                    else:
                        self._make_socket_transport(
                            conn, protocol, extra={"peername": addr}, server=server
                        )
                if self.is_closed():
                    return
                f = self._proactor.accept(sock)
            except OSError as exc:
                if sock.fileno() != -1:
                    self.call_exception_handler({
                        "message": "Accept failed on a socket",
                        "exception": exc,
                        "socket": proactor_events.trsock.TransportSocket(sock),
                    })
                    sock.close()
            except asyncio.CancelledError:
                sock.close()
            else:
                self._accept_futures[sock.fileno()] = f
                f.add_done_callback(loop)

        self.call_soon(loop)

    proactor_events.BaseProactorEventLoop._start_serving = _safe_start_serving

    # 6. Patch IocpProactor.accept (CPython gh-93821)
    # Prevents unretrieved task exception noise when ov.getresult() throws WinError 64 / OSError
    # on client abort, and ensures the accepted socket handle is properly closed.
    try:
        import _overlapped
        from asyncio import windows_events

        def _safe_accept(self, listener):
            self._register_with_iocp(listener)
            conn = self._get_accept_socket(listener.family)
            ov = _overlapped.Overlapped(windows_events.NULL)
            ov.AcceptEx(listener.fileno(), conn.fileno())

            def finish_accept(trans, key, ov):
                ov.getresult()
                buf = _struct.pack("@P", listener.fileno())
                conn.setsockopt(_socket.SOL_SOCKET, _overlapped.SO_UPDATE_ACCEPT_CONTEXT, buf)
                conn.settimeout(listener.gettimeout())
                return conn, conn.getpeername()

            async def accept_coro(future, conn):
                try:
                    await future
                except (asyncio.CancelledError, OSError):
                    conn.close()

            future = self._register(ov, listener, finish_accept)
            coro = accept_coro(future, conn)
            asyncio.ensure_future(coro, loop=self._loop)
            return future

        windows_events.IocpProactor.accept = _safe_accept
    except Exception:
        pass

    # 7. Suppress noisy unclosed transport ResourceWarnings on Windows
    warnings.filterwarnings("ignore", category=ResourceWarning, message="unclosed transport.*")
    warnings.filterwarnings("ignore", category=ResourceWarning, message="unclosed <.*PipeHandle.*")

