@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8

echo ============================================================
echo AI VIDEO GENERATION - IMAGE TEST
echo ============================================================
echo.
echo Calling Modal function to generate image...
echo.

modal run main.py::generate_image_task --job-data test_job_data.json

echo.
echo ============================================================
echo Generation complete! Check the output above for the R2 URL
echo ============================================================
