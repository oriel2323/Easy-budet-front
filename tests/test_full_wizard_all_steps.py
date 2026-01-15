import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchWindowException,
    WebDriverException,
    StaleElementReferenceException,
)

BASE_URL = "https://easy-budet-front.vercel.app/"  # או: "http://localhost:5173/"

print("LOADED FILE ✅", __file__)

# ---------- helpers ----------
def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def safe_screenshot(driver, filename="failure.png"):
    try:
        driver.save_screenshot(filename)
        return True
    except (NoSuchWindowException, WebDriverException):
        return False

def js_click(driver, element):
    driver.execute_script("arguments[0].click();", element)

def wait_text(driver, text, timeout=30):
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(normalize-space(.), '{text}')]"))
    )

def accept_alert_if_present(driver, timeout=2):
    try:
        alert = WebDriverWait(driver, timeout).until(EC.alert_is_present())
        log(f"ALERT: {alert.text}")
        alert.accept()
        return True
    except TimeoutException:
        return False

def click_button_contains(driver, text, timeout=30):
    btn = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.XPATH, f"//button[contains(normalize-space(.), '{text}')]"))
    )
    js_click(driver, btn)
    return btn

def fill_by_placeholder(driver, placeholder, value, timeout=30):
    el = WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((
            By.XPATH,
            f"//input[contains(@placeholder, '{placeholder}')] | //textarea[contains(@placeholder, '{placeholder}')]"
        ))
    )
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
    el.click()
    el.send_keys(Keys.CONTROL, "a")
    el.send_keys(str(value))
    return el

def get_modal_root(driver, timeout=30):
    try:
        return WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located(
                (By.XPATH, "//*[@role='dialog' or contains(@class,'modal') or contains(@class,'Modal')][1]")
            )
        )
    except Exception:
        return driver

def fill_register_modal(driver, full_name, email, password, timeout=30):
    modal = get_modal_root(driver, timeout=timeout)

    name_inp = WebDriverWait(modal, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text']"))
    )
    email_inp = WebDriverWait(modal, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
    )
    pass_inp = WebDriverWait(modal, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
    )

    for el, val in [(name_inp, full_name), (email_inp, email), (pass_inp, password)]:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
        el.click()
        el.send_keys(Keys.CONTROL, "a")
        el.send_keys(str(val))

def wait_after_register(driver, timeout=40):
    end = time.time() + timeout
    last_body = ""
    while time.time() < end:
        body = driver.find_element(By.TAG_NAME, "body").text
        last_body = body

        if "פרופיל עסק" in body:
            return True

        if "זהו שדה חובה" in body or "שגיאה" in body or "Error" in body or "error" in body:
            safe_screenshot(driver, "register_failed.png")
            raise AssertionError(f"Registration did not proceed. Page says:\n{body}")

        time.sleep(0.3)

    safe_screenshot(driver, "register_timeout.png")
    raise TimeoutException(
        f"Timed out waiting for 'פרופיל עסק' after registration.\nLast page text:\n{last_body}"
    )

def fill_income_add_product_row(driver, name, price, qty, direct_cost=None, timeout=30):
    add_area = WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((
            By.XPATH,
            "//*[contains(normalize-space(.), 'הוספת מוצר') or contains(normalize-space(.), 'הוספת מוצר / שירות')]/ancestor::div[1]"
        ))
    )

    inputs = add_area.find_elements(By.XPATH, ".//input")
    if len(inputs) < 3:
        safe_screenshot(driver, "income_add_area_not_found.png")
        raise AssertionError(f"Expected at least 3 inputs in income add area, found {len(inputs)}")

    vals = [str(name), str(price), str(qty)]
    if direct_cost is not None and len(inputs) >= 4:
        vals.append(str(direct_cost))

    for i, v in enumerate(vals):
        el = inputs[i]
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
        el.click()
        el.send_keys(Keys.CONTROL, "a")
        el.send_keys(v)

def assert_product_added(driver, product_name, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, f"//*[contains(normalize-space(.), '{product_name}')]"))
        )
    except TimeoutException:
        safe_screenshot(driver, "product_not_added.png")
        raise AssertionError(f"Product '{product_name}' was not found on screen after clicking 'הוסף'.")

def _inner_text_len(driver, el):
    # בלי el.text כדי לא להיתקע על stale; ואם stale – נזרוק וננסה שוב בלופ
    return int(driver.execute_script("return (arguments[0].innerText || '').length;", el))

def fill_expense_card_amount(driver, card_title, amount, timeout=50):
    """
    עמיד ל-stale:
    - בכל איטרציה מאתרים מחדש "קונטיינרים" שמכילים input + טקסט של הכרטיס
    - מסננים קונטיינרים ענקיים (כל הדף) לפי innerText length
    - ממלאים את ה-input הראשון בתוך הקונטיינר
    """
    variants = [card_title]
    if card_title == "משכורות עובדים":
        variants += ["משכורות", "שכר", "עלות מעסיק", "משכורות עובדים (עלות מעסיק)"]

    end = time.time() + timeout
    last_err = None

    while time.time() < end:
        try:
            for t in variants:
                # קונטיינר שיש בו גם input וגם את הטקסט המבוקש
                containers = driver.find_elements(
                    By.XPATH,
                    f"//*[.//input and contains(normalize-space(.), '{t}')]"
                )

                for c in containers:
                    try:
                        L = _inner_text_len(driver, c)
                        if L > 2500:  # כנראה שזה “כל הדף”
                            continue

                        inp = c.find_element(By.XPATH, ".//input")
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", inp)
                        inp.click()
                        inp.send_keys(Keys.CONTROL, "a")
                        inp.send_keys(str(amount))
                        return inp

                    except StaleElementReferenceException as e:
                        last_err = e
                        continue
                    except Exception as e:
                        last_err = e
                        continue

            time.sleep(0.25)

        except StaleElementReferenceException as e:
            last_err = e
            time.sleep(0.2)

    safe_screenshot(driver, "expense_card_not_found.png")
    raise TimeoutException(
        f"Could not find expense input for '{card_title}'. Saved expense_card_not_found.png. LastErr={last_err}"
    )

# ---------- main test ----------
def test_full_wizard_all_steps_new_user():
    log("START TEST ✅")

    options = webdriver.ChromeOptions()
    # אם אתם רוצים לראות הכל יציב:
    # options.add_argument("--start-maximized")
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1440, 900)

    unique_email = f"selenium_{int(time.time())}@test.il"
    password = "Test12345!"
    full_name = "סולניום בדיקה"

    try:
        log("Open site")
        driver.get(BASE_URL)

        # === התחלה + הרשמה ===
        log("Click: התחל בחינם עכשיו")
        click_button_contains(driver, "התחל בחינם עכשיו")
        wait_text(driver, "צור חשבון חדש")

        log(f"Register new user: {unique_email}")
        fill_register_modal(driver, full_name, unique_email, password)
        click_button_contains(driver, "הרשם")

        log("Wait after register -> פרופיל עסק")
        wait_after_register(driver, timeout=45)

        # === שלב 1: פרופיל עסק ===
        log("Step 1: פרופיל עסק")
        wait_text(driver, "פרופיל עסק")
        fill_by_placeholder(driver, "לדוגמה: קפה בוקר טוב", "Easy Budget QA")
        fill_by_placeholder(driver, "עיר, רחוב", "תל אביב, דיזנגוף 1")
        fill_by_placeholder(driver, "050-0000000", "0500000000")
        click_button_contains(driver, "המשך לשלב הבא")

        # === שלב 2: הכנסות ===
        log("Step 2: הכנסות")
        wait_text(driver, "הכנסות")
        product_name = "מוצר בדיקה"

        fill_income_add_product_row(driver, name=product_name, price=100, qty=10, direct_cost=30)
        click_button_contains(driver, "הוסף")
        assert_product_added(driver, product_name, timeout=12)

        click_button_contains(driver, "המשך לשלב הבא")
        accept_alert_if_present(driver, timeout=2)  # אם בכל זאת קופץ "לא הזנת מוצרים"

        # === שלב 3: עלויות מכר ===
        log("Step 3: עלויות מכר")
        wait_text(driver, "עלויות מכר")

        # סדר לפי מה שראיתם שקיים במסך בפועל
        fill_expense_card_amount(driver, "שכירות משרד", 1500, timeout=60)
        fill_expense_card_amount(driver, "משכורות עובדים", 5000, timeout=60)
        fill_expense_card_amount(driver, "ארנונה", 200, timeout=60)

        click_button_contains(driver, "המשך לשלב הבא")

        # === שלב 4: הוצאות קבועות ===
        log("Step 4: הוצאות קבועות")
        wait_text(driver, "הוצאות קבועות")

        fill_expense_card_amount(driver, "רואה חשבון", 300, timeout=60)
        fill_expense_card_amount(driver, "הנהלת חשבונות", 250, timeout=60)
        fill_expense_card_amount(driver, "שיווק", 400, timeout=60)

        click_button_contains(driver, "סיום והצגת דוח")

        # === דוח ===
        log("Wait report")
        wait_text(driver, "דוח", timeout=90)

        log("✅ PASS - reached report")
        assert True

    except Exception as e:
        safe_screenshot(driver, "FAILED.png")
        log(f"❌ FAIL: {e}")
        raise

    finally:
        try:
            driver.quit()
        except Exception:
            pass

if __name__ == "__main__":
    test_full_wizard_all_steps_new_user()
