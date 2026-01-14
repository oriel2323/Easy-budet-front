from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_login_experiment():
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 15)

    try:
        driver.get("https://easy-budet-front.vercel.app/")

        # 1) לחץ על כפתור "התחברות"
        login_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='התחברות']"))
        )
        login_btn.click()

        # 2) עכשיו חפש שדות מייל וסיסמה
        email_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[name*='email' i]"))
        )
        password_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
        )

        # 3) הזן פרטים
        email_input.clear()
        email_input.send_keys("selenium@gmail.com")  # משתמש אמיתי
        password_input.clear()
        password_input.send_keys("12345")            # סיסמה אמיתית

        # שליחה
        password_input.send_keys(Keys.ENTER)

        # 4) אימות הצלחה (שנה לטקסט שבאמת מופיע אצלכם אחרי כניסה)
        wait.until(
            EC.presence_of_element_located((
                By.XPATH,
                "//*[contains(.,'התנתק') or contains(.,'Logout') or contains(.,'Dashboard') or contains(.,'דשבורד')]"
            ))
            
        )

        assert True

    finally:
        driver.quit()
