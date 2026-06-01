import os
import re
import time

from playwright.sync_api import expect, sync_playwright


DEFAULT_FRONTEND_URLS = [
    "http://localhost:5174",
    "http://localhost:5175",
]
DEFAULT_MAKER = {
    "email": "maker-a@protolive.local",
    "password": "pass-mock-01",
}


def collect_frontend_targets() -> list[str]:
    env_target = os.environ.get("FRONTEND_URL")
    urls = [
        *( [env_target.rstrip("/")] if env_target else []),
        *[url for url in DEFAULT_FRONTEND_URLS],
    ]

    deduped: list[str] = []
    for url in urls:
        if url not in deduped:
            deduped.append(url)

    return deduped


def wait_for_frontend(page, url: str) -> bool:
    last_error: BaseException | None = None
    for _ in range(12):
        try:
            page.goto(url, wait_until="networkidle")
            return True
        except Exception as error:
            last_error = error
            time.sleep(0.5)

    if last_error is None:
        return False
    return False


def wait_for_api_online(page) -> None:
    expect(page.get_by_text(re.compile(r"API Online"))).to_be_visible(timeout=120000)


def login_as_maker(page) -> None:
    header_login = page.locator('button[aria-label="로그인"]')
    login_dialog = page.get_by_role("dialog").filter(has_text="로그인")
    email_input = login_dialog.get_by_label("이메일")

    if email_input.count() == 0 or not email_input.first.is_visible():
        if header_login.count() == 0 or not header_login.is_visible():
            return

        header_login.click()
        expect(page.get_by_text("로그인")).to_be_visible()
        email_input = login_dialog.get_by_label("이메일")

    email_input.fill(
        os.environ.get("SMOKE_USER_EMAIL", DEFAULT_MAKER["email"]),
    )
    login_dialog.get_by_label("비밀번호").fill(
        os.environ.get("SMOKE_USER_PASSWORD", DEFAULT_MAKER["password"]),
    )
    login_dialog.get_by_role("button", name="로그인").first.click()
    expect(page.get_by_text("로그아웃").first).to_be_visible(timeout=30000)


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            mobile = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True)

            base_url = None
            for url in collect_frontend_targets():
                if wait_for_frontend(page, url):
                    base_url = url
                    break

            if base_url is None:
                raise RuntimeError("Frontend is not reachable on candidate URLs.")

            wait_for_frontend(mobile, base_url)

            expect(page.get_by_role("heading", name="ProtoLive")).to_be_visible()
            expect(page.get_by_text(re.compile(r"API (Online|Offline)")).first).to_be_visible()
            expect(page.get_by_text("Signal Leaderboard")).to_be_visible()

            login_as_maker(page)
            wait_for_api_online(page)

            expect(page.get_by_role("heading", name="SignalBoard for Founders")).to_be_visible(timeout=30000)
            page.get_by_role("button", name=re.compile("실사 요약")).first.click()
            expect(page.get_by_role("dialog", name=re.compile("실사 리포트"))).to_be_visible()
            expect(page.get_by_text("Proof Ledger")).to_be_visible()
            expect(page.get_by_text("투자 판단 메모")).to_be_visible()
            page.get_by_role("button", name="닫기", exact=True).click()

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
            expect(page.get_by_role("button", name=re.compile("추천 적용")).first).to_be_visible()
            page.get_by_role("button", name=re.compile("추천 적용")).first.click()
            expect(page.get_by_text("추천 액션 적용")).to_be_visible()
            page.screenshot(path="/private/tmp/protolive-admin-smoke.png", full_page=True)

            mobile.goto(base_url, wait_until="networkidle")
            expect(mobile.get_by_role("heading", name="ProtoLive")).to_be_visible()
            expect(mobile.get_by_role("button", name=re.compile("프로토타입 등록"))).to_be_visible()
            mobile.screenshot(path="/private/tmp/protolive-smoke-mobile.png", full_page=True)

            page.goto(base_url, wait_until="networkidle")
            expect(page.get_by_role("button", name="관리자")).to_be_visible(timeout=5000)
            page.get_by_role("button", name="관리자").click()
            expect(page).to_have_url(re.compile(r".*/admin"))
            expect(page.get_by_text("수익 모델·운영 지표를 실험하는 관리자 대시보드")).to_be_visible()
            page.screenshot(path="/private/tmp/protolive-admin-nav-smoke.png", full_page=True)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
