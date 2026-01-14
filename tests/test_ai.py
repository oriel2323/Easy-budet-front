from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


def test_ai_recommendations_smoke():
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 30)

    try:
        # 1. כניסה לאתר
        driver.get("https://easy-budet-front.vercel.app/")

        # 2. התחברות
        login_btn = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='התחברות']")
            )
        )
        login_btn.click()

        email_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='email']"))
        )
        email_input.send_keys("selenium@gmail.com")

        password_input = driver.find_element(By.XPATH, "//input[@type='password']")
        password_input.send_keys("12345")

        submit_btn = driver.find_element(
            By.XPATH, "//button[normalize-space()='התחבר']")
        submit_btn.click()

        # 3. וידוא שהגענו למסך הדוח
        wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//*[contains(text(),'דוח רווח והפסד')]")
            )
        )

        # 4. שמירת טקסט לפני הפעלת AI
        body = driver.find_element(By.TAG_NAME, "body")
        text_before = body.text.strip()

        # 5. לחיצה על כפתור AI
        ai_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(text(),'AI')]")
            )
        )
        ai_button.click()

        # 6. שינוי ראשון – התחלת תהליך (loading / analyzing)
        def first_text_change(drv):
            t = drv.find_element(By.TAG_NAME, "body").text.strip()
            return t if t != text_before else False

        text_after_first = wait.until(first_text_change)

        # 7. שינוי שני – פלט סופי של AI
        def second_text_change(drv):
            t = drv.find_element(By.TAG_NAME, "body").text.strip()
            return t if t != text_after_first else False

        text_after_second = wait.until(second_text_change)

        # 8. Assertions – יש פלט אמיתי למשתמש
        assert len(text_after_second) > len(text_after_first), \
            "הטקסט לא התפתח לפלט סופי של AI"

        assert any(keyword in text_after_second for keyword in [
            "AI", "המלצה", "ניתוח", "תובנות", "רווח", "הוצאות"
        ]), "לא זוהו מילות מפתח שמצביעות על פלט AI"

    except Exception:
        # צילום מסך במקרה של כשל
        driver.save_screenshot("ai_test_failure.png")
        raise

    finally:
        time.sleep(2)
        driver.quit()
