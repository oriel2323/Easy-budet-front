# tests/test_report_matches_input.py
import re
import time
from dataclasses import dataclass
from typing import List, Optional, Dict

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

# ---------------- logging ----------------
def log(msg: str):
    now = time.strftime("%H:%M:%S")
    print(f"[{now}] {msg}")

# ---------------- helpers ----------------
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
    """
    מסך 'הכנסות' - מילוי שורת הוספת מוצר/שירות בלי להסתמך על placeholder.
    [0]=שם מוצר, [1]=מחיר מכירה, [2]=כמות חודשית, [3]=עלות ישירה (אם קיימת)
    """
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

def fill_expense_card_amount(driver, card_title, amount, timeout=50):
    """
    איתור יציב לפי כותרת + ancestor שמכיל input.
    """
    variants = [card_title]
    if card_title == "משכורות עובדים":
        variants += ["משכורות", "שכר", "עלות מעסיק", "משכורות עובדים (עלות מעסיק)"]

    end = time.time() + timeout
    last_err = None

    while time.time() < end:
        try:
            for t in variants:
                title_candidates = driver.find_elements(
                    By.XPATH,
                    (
                        "//*[self::h1 or self::h2 or self::h3 or self::h4 or self::p or self::span or self::div]"
                        f"[contains(normalize-space(.), '{t}')]"
                    )
                )

                for title_el in title_candidates:
                    try:
                        container = title_el.find_element(By.XPATH, "./ancestor::*[.//input][1]")
                        inp = container.find_element(By.XPATH, ".//input")
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

# ---------------- report parsing (robust cards) ----------------
def normalize_he(text: str) -> str:
    if not text:
        return ""
    t = text.replace("\u00A0", " ").strip()
    # unify quotes
    t = t.replace("״", '"').replace("׳", "'").replace("”", '"').replace("“", '"')
    # remove punctuation that often differs between renders
    t = re.sub(r"[():\[\]{}]", " ", t)
    t = t.replace("₪", " ")
    t = t.replace("\n", " ")
    t = re.sub(r"\s+", " ", t).strip().lower()
    return t

def parse_ils_number(text: str) -> float:
    if text is None:
        raise ValueError("Empty text for number parsing")
    t = text.replace("\u00A0", " ").strip()
    m = re.search(r"(-?\d[\d,]*\.?\d*)", t)
    if not m:
        raise ValueError(f"Could not parse number from: {text}")
    num = m.group(1).replace(",", "")
    return float(num)

def extract_first_number_from_element(el) -> Optional[float]:
    try:
        txt = (el.text or "").replace("\u00A0", " ").strip()
        if not txt:
            return None
        if not re.search(r"-?\d", txt):
            return None
        return parse_ils_number(txt)
    except Exception:
        return None

def find_kpi_card_value(driver, title_variants: List[str], timeout=25) -> float:
    """
    מוצא כרטיס KPI לפי כותרת (עם וריאציות), ושולף את המספר מהכרטיס.
    עובד גם אם יש גרשיים/סוגריים/רווחים שונים.
    """
    norm_targets = [normalize_he(x) for x in title_variants]
    end = time.time() + timeout
    last_err = None

    while time.time() < end:
        try:
            # נאתר מועמדים לטייטל ע"י XPATH contains (מהיר), ואז נבצע match בנירמול
            any_piece = title_variants[0]
            title_els = driver.find_elements(By.XPATH, f"//*[contains(normalize-space(.), '{any_piece}')]")

            # אם לא מצא לפי ה"חתיכה" הראשונה – ננסה לאסוף עוד לפי שאר הוריאציות
            if not title_els:
                for v in title_variants[1:]:
                    title_els.extend(driver.find_elements(By.XPATH, f"//*[contains(normalize-space(.), '{v}')]"))

            for te in title_els:
                try:
                    ttxt = normalize_he(te.text or "")
                    if not ttxt:
                        continue
                    if not any(target in ttxt for target in norm_targets):
                        continue

                    # כרטיס = ancestor שיש בו גם title וגם מספר/₪
                    card = te.find_element(
                        By.XPATH,
                        "./ancestor::*[.//*[contains(.,'₪') or re:match(normalize-space(.), '.*[0-9].*')]][1]"
                    )
                except Exception:
                    # fallback בלי regex namespace
                    try:
                        card = te.find_element(By.XPATH, "./ancestor::*[.//*[contains(.,'₪')]][1]")
                    except Exception:
                        try:
                            card = te.find_element(By.XPATH, "./ancestor::*[1]")
                        except Exception:
                            continue

                # בתוך הכרטיס נחפש אלמנטים טקסטואליים שמכילים מספר
                try:
                    candidates = card.find_elements(By.XPATH, ".//*[self::span or self::p or self::div or self::td or self::h1 or self::h2 or self::h3 or self::h4]")
                    # נחפש קודם כאלה שמכילים ₪ (בד"כ הערך)
                    for c in candidates:
                        try:
                            txt = (c.text or "").strip()
                            if "₪" in txt and re.search(r"\d", txt):
                                val = extract_first_number_from_element(c)
                                if val is not None:
                                    return val
                        except StaleElementReferenceException:
                            continue

                    # ואז fallback: כל מספר שהוא (מינוס הטייטל)
                    for c in candidates:
                        try:
                            txt = (c.text or "").strip()
                            if not txt:
                                continue
                            if normalize_he(txt) == normalize_he(te.text or ""):
                                continue
                            val = extract_first_number_from_element(c)
                            if val is not None:
                                return val
                        except StaleElementReferenceException:
                            continue

                except StaleElementReferenceException as e:
                    last_err = e
                    continue

            time.sleep(0.25)

        except StaleElementReferenceException as e:
            last_err = e
            time.sleep(0.2)

    safe_screenshot(driver, "kpi_card_not_found.png")
    raise AssertionError(f"Could not locate KPI card value. Tried titles={title_variants}. LastErr={last_err}")

# ---------------- expected model ----------------
@dataclass
class Product:
    name: str
    price: float
    qty: float
    direct_cost_per_unit: float  # עלות ייצור ליחידה

    @property
    def revenue_monthly(self) -> float:
        return self.price * self.qty

    @property
    def production_cost_monthly(self) -> float:
        return self.direct_cost_per_unit * self.qty

@dataclass
class Inputs:
    products: List[Product]
    exp_cost_of_sales: float  # עלויות מכר (סה"כ חודשי)
    exp_fixed: float          # הוצאות הנהלה וכלליות/קבועות (סה"כ חודשי)

    @property
    def revenue_monthly(self) -> float:
        return sum(p.revenue_monthly for p in self.products)

    @property
    def revenue_yearly(self) -> float:
        return self.revenue_monthly * 12

    @property
    def production_cost_monthly(self) -> float:
        return sum(p.production_cost_monthly for p in self.products)

    @property
    def production_cost_yearly(self) -> float:
        return self.production_cost_monthly * 12

    @property
    def total_expenses_monthly(self) -> float:
        # סה"כ הוצאות = עלות ייצור + עלויות מכר + הוצאות הנהלה וכלליות
        return self.production_cost_monthly + self.exp_cost_of_sales + self.exp_fixed

    @property
    def total_expenses_yearly(self) -> float:
        return self.total_expenses_monthly * 12

    @property
    def gross_profit_monthly(self) -> float:
        # רווח גולמי = הכנסות - (עלות ייצור + עלויות מכר)
        return self.revenue_monthly - self.production_cost_monthly - self.exp_cost_of_sales

    @property
    def gross_profit_yearly(self) -> float:
        return self.gross_profit_monthly * 12

    @property
    def operating_profit_monthly(self) -> float:
        # רווח תפעולי = רווח גולמי - הוצאות הנהלה וכלליות
        return self.gross_profit_monthly - self.exp_fixed

    @property
    def operating_profit_yearly(self) -> float:
        return self.operating_profit_monthly * 12

def assert_close(actual: float, expected: float, label: str, tol: float = 0.01):
    if abs(actual - expected) > tol:
        raise AssertionError(f"{label}: expected {expected} but got {actual}")

# ---------------- test ----------------
def test_report_matches_input_front_only():
    driver = webdriver.Chrome()
    driver.set_window_size(1440, 900)

    # === נתונים “עם בשר” ===
    # 2 מוצרים כדי לוודא שהסכימה/חישובים עובדים ולא רק ערך יחיד
    products = [
        Product(name="מוצר בדיקה A", price=120, qty=15, direct_cost_per_unit=35),
        Product(name="מוצר בדיקה B", price=80,  qty=25, direct_cost_per_unit=20),
    ]

    inp = Inputs(
        products=products,
        # שלב 3: עלויות מכר (חודשי)
        exp_cost_of_sales=1500 + 5000 + 200,   # שכירות משרד + משכורות + ארנונה
        # שלב 4: הוצאות קבועות/הנהלה (חודשי)
        exp_fixed=300 + 250 + 400,             # רואה חשבון + הנהלת חשבונות + שיווק
    )

    unique_email = f"selenium_{int(time.time())}@test.il"
    password = "Test12345!"
    full_name = "סולניום בדיקה"

    try:
        log("START TEST 2 ✅")
        driver.get(BASE_URL)
        log("Open site")

        # --- register ---
        click_button_contains(driver, "התחל בחינם עכשיו")
        wait_text(driver, "צור חשבון חדש")
        log(f"Register new user: {unique_email}")

        fill_register_modal(driver, full_name, unique_email, password)
        click_button_contains(driver, "הרשם")
        wait_after_register(driver, timeout=50)

        # --- Step 1 ---
        wait_text(driver, "פרופיל עסק")
        log("Step 1: פרופיל עסק")
        fill_by_placeholder(driver, "לדוגמה: קפה בוקר טוב", "Easy Budget QA")
        fill_by_placeholder(driver, "עיר, רחוב", "תל אביב, דיזנגוף 1")
        fill_by_placeholder(driver, "050-0000000", "0500000000")
        click_button_contains(driver, "המשך לשלב הבא")

        # --- Step 2 ---
        wait_text(driver, "הכנסות")
        log("Step 2: הכנסות")

        for p in products:
            fill_income_add_product_row(
                driver,
                name=p.name,
                price=p.price,
                qty=p.qty,
                direct_cost=p.direct_cost_per_unit
            )
            click_button_contains(driver, "הוסף")
            assert_product_added(driver, p.name, timeout=10)

        click_button_contains(driver, "המשך לשלב הבא")
        accept_alert_if_present(driver, timeout=2)

        # --- Step 3 ---
        wait_text(driver, "עלויות מכר")
        log("Step 3: עלויות מכר")
        fill_expense_card_amount(driver, "שכירות משרד", 1500, timeout=60)
        fill_expense_card_amount(driver, "משכורות עובדים", 5000, timeout=60)
        fill_expense_card_amount(driver, "ארנונה", 200, timeout=60)
        click_button_contains(driver, "המשך לשלב הבא")

        # --- Step 4 ---
        wait_text(driver, "הוצאות קבועות")
        log("Step 4: הוצאות קבועות")
        fill_expense_card_amount(driver, "רואה חשבון", 300, timeout=60)
        fill_expense_card_amount(driver, "הנהלת חשבונות", 250, timeout=60)
        fill_expense_card_amount(driver, "שיווק", 400, timeout=60)
        click_button_contains(driver, "סיום והצגת דוח")

        # --- Report ---
        log("Wait report")
        wait_text(driver, "דוח", timeout=80)
        safe_screenshot(driver, "report_reached.png")

        # ===== KPI cards mapping =====
        # פה עשינו את התיקון המרכזי: כל KPI מחפש כמה וריאציות (לא טייטל יחיד).
        card_titles: Dict[str, List[str]] = {
            "revenue_yearly": [
                'סה"כ הכנסות שנתי',
                'סך הכנסות שנתי',
                'הכנסות שנתיות',
                'סה"כ הכנסות',
            ],
            "production_cost_yearly": [
                'סה"כ עלויות ייצור שנתי',
                'סך עלויות ייצור שנתי',
                'עלויות ייצור שנתי',
                'סה"כ עלויות ייצור',
            ],
            "cos_yearly": [
                'סה"כ הוצאות קבועות (עלות מכר) שנתי',
                'סה"כ הוצאות קבועות (עלויות מכר) שנתי',
                'סה"כ הוצאות קבועות עלות מכר שנתי',
                'סה"כ הוצאות (עלות מכר) שנתי',
                'סה"כ עלות מכר שנתי',
                'עלות מכר שנתי',
            ],
            "fixed_yearly": [
                'סה"כ הוצאות הנהלה וכלליות שנתי',
                'סה"כ הוצאות הנהלה וכלליות',
                'הוצאות הנהלה וכלליות שנתי',
                'הוצאות קבועות שנתי',
            ],
            "gross_profit_yearly": [
                'רווח גולמי שנתי',
                'סה"כ רווח גולמי שנתי',
                'רווח גולמי',
            ],
            "operating_profit_yearly": [
                'רווח תפעולי שנתי',
                'סה"כ רווח תפעולי שנתי',
                'רווח תפעולי',
            ],
        }

        ui_rev_y = find_kpi_card_value(driver, card_titles["revenue_yearly"], timeout=25)
        ui_prod_y = find_kpi_card_value(driver, card_titles["production_cost_yearly"], timeout=25)
        ui_cos_y = find_kpi_card_value(driver, card_titles["cos_yearly"], timeout=25)
        ui_fixed_y = find_kpi_card_value(driver, card_titles["fixed_yearly"], timeout=25)
        ui_gp_y = find_kpi_card_value(driver, card_titles["gross_profit_yearly"], timeout=25)
        ui_op_y = find_kpi_card_value(driver, card_titles["operating_profit_yearly"], timeout=25)

        log(f"UI yearly revenue: {ui_rev_y}")
        log(f"UI yearly production cost: {ui_prod_y}")
        log(f"UI yearly cost of sales: {ui_cos_y}")
        log(f"UI yearly fixed/general: {ui_fixed_y}")
        log(f"UI yearly gross profit: {ui_gp_y}")
        log(f"UI yearly operating profit: {ui_op_y}")

        # Expected
        exp_rev_y = inp.revenue_yearly
        exp_prod_y = inp.production_cost_yearly
        exp_cos_y = inp.exp_cost_of_sales * 12
        exp_fixed_y = inp.exp_fixed * 12
        exp_gp_y = inp.gross_profit_yearly
        exp_op_y = inp.operating_profit_yearly

        # asserts
        assert_close(ui_rev_y, exp_rev_y, "Revenue yearly")
        assert_close(ui_prod_y, exp_prod_y, "Production cost yearly")
        assert_close(ui_cos_y, exp_cos_y, "Cost of sales yearly")
        assert_close(ui_fixed_y, exp_fixed_y, "Fixed/general yearly")
        assert_close(ui_gp_y, exp_gp_y, "Gross profit yearly")
        assert_close(ui_op_y, exp_op_y, "Operating profit yearly")

        log("✅ PASS - report matches input calculations (KPI cards)")

    finally:
        try:
            driver.quit()
        except Exception:
            pass

if __name__ == "__main__":
    test_report_matches_input_front_only()