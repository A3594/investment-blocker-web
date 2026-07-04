@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 월 1회 투자 확인 잠금 웹을 실행합니다.
echo.
echo PC에서 열기: http://127.0.0.1:8787
echo 핸드폰은 같은 Wi-Fi에서 PC의 IPv4 주소로 접속하세요. 예: http://192.168.0.10:8787
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
echo.
python -m http.server 8787
