import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_register_new_user():
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 30)

    unique_email = f"selenium_{int(time.time())}@gmail.com"
    password = "Test12345!"
    full_name = "Selenium Test"

    try:
        driver.get("https://easy-budet-front.vercel.app/")

        # 1) פתיחת מודאל התחברות
        login_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='התחברות']"))
        )
        login_btn.click()

        # 2) מעבר למסך הרשמה
        register_switch_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(normalize-space(.), 'התחל בחינם')]"))
        )
        driver.execute_script("arguments[0].click();", register_switch_btn)

        # 3) לוודא שמסך הרשמה נטען
        wait.until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(normalize-space(.),'שם מלא') or contains(normalize-space(.),'הרשם')]"))
        )

        # 4) שדות הרשמה
        full_name_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text']")))
        email_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
        password_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']")))

        # 5) מילוי
        full_name_input.clear()
        full_name_input.send_keys(full_name)

        email_input.clear()
        email_input.send_keys(unique_email)

        password_input.clear()
        password_input.send_keys(password)

        # 6) שליחה
        submit_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(normalize-space(.),'הרשם')]"))
        )
        driver.execute_script("arguments[0].click();", submit_btn)

        # 7) אימות הצלחה בלי "התנתקות":
        #    או שמופיעה שגיאה -> FAIL
        #    או שטופס ההרשמה נסגר/נעלם -> PASS (למשל שדה email נעלם)
        error_xpath = "//*[contains(.,'[object Object]') or contains(normalize-space(.),'שגיאה') or contains(normalize-space(.),'Error') or contains(normalize-space(.),'error')]"

        wait.until(
            EC.any_of(
                EC.presence_of_element_located((By.XPATH, error_xpath)),
                EC.invisibility_of_element_located((By.CSS_SELECTOR, "input[type='email']")),
            )
        )

        # אם יש שגיאה – נכשל
        errs = driver.find_elements(By.XPATH, error_xpath)
        if errs:
            raise AssertionError(f"Registration failed. UI says: {errs[0].text}")

        # אחרת, הגענו לכאן כי ה-email input נעלם -> הצלחה
        assert True

    finally:
        driver.quit()
