@echo off
title StreamLab - Stop Docker Containers
echo =========================================================================
echo  Stopping StreamLab Containers...
echo =========================================================================
echo.
docker compose down
echo.
echo All StreamLab services have been stopped.
pause
