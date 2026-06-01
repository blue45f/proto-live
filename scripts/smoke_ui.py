import os
import re
import time

from playwright.sync_api import expect, sync_playwright


FRONTEND_DEFAULT_URL = "http://localhost:5174"


def wait_for_frontend(page, frontend_url: str) -> None:
    last_error: BaseException | None = None
    for _ in range(10):
        try:
            page.goto(frontend_url, wait_until="networkidle")
            return
        except Exception as error:
            last_error = error
            time.sleep(0.5)

    assert last_error is not None
    raise last_error


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            mobile = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True)

            frontend_url = os.environ.get("FRONTEND_URL", FRONTEND_DEFAULT_URL)
            base_url = frontend_url.rstrip("/")
            wait_for_frontend(page, frontend_url)
            wait_for_frontend(mobile, frontend_url)

            expect(page.get_by_text("ProtoLive").first).to_be_visible()
            expect(page.get_by_text(re.compile(r"API (Online|Offline)")).first).to_be_visible()
            expect(page.get_by_text("Signal Leaderboard")).to_be_visible()

            content = page.content()
            assert "ProtoLive 데모" not in content

            register_button = page.get_by_role("button", name=re.compile("프로토타입 등록"))
            expect(register_button).to_be_enabled(timeout=30000)
            register_button.click()
            expect(page.get_by_text("라이브 프로토타입 등록")).to_be_visible()
            expect(page.get_by_text("상용화 전 서비스 보호 설정")).to_be_visible()
            expect(page.locator("button", has_text="선별 공개").first).to_be_visible()
            expect(page.locator("select").first).to_contain_text("AI & SaaS")

            page.screenshot(path="/private/tmp/protolive-smoke.png", full_page=True)

            page.goto(f"{base_url}/admin", wait_until="networkidle")
            expect(page).to_have_url(re.compile(r".*/admin"))
            expect(page.get_by_role("button", name="프로토타입 등록")).to_be_visible()
            expect(page.get_by_text("수익 모델·운영 지표를 실험하는 관리자 대시보드")).to_be_visible()
            page.screenshot(path="/private/tmp/protolive-admin-smoke.png", full_page=True)

            mobile.goto(frontend_url, wait_until="networkidle")
            expect(mobile.get_by_text("ProtoLive").first).to_be_visible()
            expect(mobile.get_by_role("button", name=re.compile("프로토타입 등록"))).to_be_visible()
            mobile.screenshot(path="/private/tmp/protolive-smoke-mobile.png", full_page=True)

            page.goto(frontend_url, wait_until="networkidle")
            expect(page.get_by_role("button", name="관리자")).to_be_visible(timeout=5000)
            page.get_by_role("button", name="관리자").click()
            expect(page).to_have_url(re.compile(r".*/admin"))
            expect(page.get_by_text("수익 모델·운영 지표를 실험하는 관리자 대시보드")).to_be_visible()
            page.screenshot(path="/private/tmp/protolive-admin-nav-smoke.png", full_page=True)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
