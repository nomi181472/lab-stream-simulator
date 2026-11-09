"""
Windows-specific Asyncio Proactor patches for known CPython bugs (gh-83413, gh-100055).
Prevents 'ValueError: I/O operation on closed pipe' from crashing in
BaseSubprocessTransport.__del__ and _ProactorBasePipeTransport.__repr__ / __del__
during garbage collection or teardown of subprocess transports on Windows.
"""

import sys
import warnings


def patch_windows_asyncio() -> None:
    """Apply safety patches to asyncio on Windows to prevent closed pipe exceptions."""
    if sys.platform != "win32":
        return

    import asyncio
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

    # 5. Suppress noisy unclosed transport ResourceWarnings on Windows
    warnings.filterwarnings("ignore", category=ResourceWarning, message="unclosed transport.*")
    warnings.filterwarnings("ignore", category=ResourceWarning, message="unclosed <.*PipeHandle.*")
