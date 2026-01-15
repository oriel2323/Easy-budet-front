# tests/test_report_matches_input.py
import re
import time
from dataclasses import dataclass
from typing import Optional, List

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


# ---------------- number parsing ----------------
def parse_ils_number(text: str) -> float:
    """
    שולף מספר מתוך טקסט (₪, פסיקים, נקודה, מינוס).
    """
    if text is None:
        raise ValueError("Empty text for number parsing")

    t = text.replace("\u00A0", " ").strip()

    # תומך גם "₪ -1,234" וגם "- ₪ 1,234"
    m = re.search(r"(-?\s*\d[\d,]*\.?\d*)", t)
    if not m:
        raise ValueError(f"Could not parse number from: {text}")

    num = m.group(1).replace(",", "").replace(" ", "")
    return float(num)


# ---------------- report extractors (NEW) ----------------
def find_card_value_by_title(driver, title: str, timeout=20) -> float:
    """
    בדוח שלך יש כרטיסים למעלה כמו: 'סה"כ הכנסות שנתי' + ערך '₪ ...'
    הפונקציה מוצאת את הכרטיס לפי הכותרת ומחזירה את המספר שבתוכו.
    """
    end = time.time() + timeout
    last_err = None

    while time.time() < end:
        try:
            title_els = driver.find_elements(By.XPATH, f"//*[contains(normalize-space(.), '{title}')]")
            for te in title_els:
                try:
                    # קח ancestor שמכיל גם את הכותרת וגם ערך עם ₪
                    card = te.find_element(By.XPATH, "./ancestor::*[.//*[contains(., '₪')]][1]")
                    # מצא טקסט עם ₪ בתוך הכרטיס
                    money_els = card.find_elements(By.XPATH, ".//*[contains(., '₪')]")
                    for me in money_els:
                        txt = (me.text or "").strip()
                        if "₪" in txt and re.search(r"\d", txt):
                            return parse_ils_number(txt)
                except StaleElementReferenceException as e:
                    last_err = e
                    continue
                except Exception as e:
                    last_err = e
                    continue

            time.sleep(0.25)
        except Exception as e:
            last_err = e
            time.sleep(0.2)

    safe_screenshot(driver, f"card_not_found_{title}.png")
    raise AssertionError(f"Could not locate card value for '{title}'. LastErr={last_err}")


def get_month_column_index(driver, month_name: str, timeout=20) -> int:
    """
    מוצא אינדקס עמודה בטבלה לפי שם חודש (ינואר/פברואר/...).
    מחזיר אינדקס 1-based לטובת XPath של td[n].
    """
    end = time.time() + timeout
    while time.time() < end:
        try:
            headers = driver.find_elements(By.XPATH, f"//th[contains(normalize-space(.), '{month_name}')]")
            if headers:
                # ניקח את הראשון ונחשב index שלו בתוך כל ה-th באותה שורה
                th = headers[0]
                row = th.find_element(By.XPATH, "./ancestor::tr[1]")
                all_th = row.find_elements(By.XPATH, "./th")
                for i, h in enumerate(all_th, start=1):
                    if (h.text or "").strip() == (th.text or "").strip():
                        return i
        except Exception:
            pass
        time.sleep(0.25)
    raise AssertionError(f"Could not find table header for month '{month_name}'")


def find_table_value_by_row_and_month(driver, row_label_contains: str, month_name: str, timeout=25) -> float:
    """
    בדוח יש טבלת חודשים. בצד ימין מופיע שם השורה (למשל: 'סה\"כ הכנסה חודשית:')
    אנחנו מוצאים את ה-tr לפי שם השורה, ואז קוראים את התא של החודש.
    """
    end = time.time() + timeout
    last_err = None

    col_idx = get_month_column_index(driver, month_name, timeout=timeout)

    while time.time() < end:
        try:
            # locate row by label anywhere in that row
            rows = driver.find_elements(By.XPATH, f"//tr[.//*[contains(normalize-space(.), '{row_label_contains}')]]")
            for r in rows:
                try:
                    # value cell: td[col_idx] OR th[col_idx] depending on markup
                    cells = r.find_elements(By.XPATH, "./td|./th")
                    if len(cells) >= col_idx:
                        txt = (cells[col_idx - 1].text or "").strip()
                        if re.search(r"\d", txt) or "₪" in txt:
                            return parse_ils_number(txt)
                except StaleElementReferenceException as e:
                    last_err = e
                    continue
                except Exception as e:
                    last_err = e
                    continue

            time.sleep(0.25)
        except Exception as e:
            last_err = e
            time.sleep(0.2)

    safe_screenshot(driver, f"table_row_not_found_{row_label_contains}.png")
    raise AssertionError(
        f"Could not locate table value for row '{row_label_contains}' month '{month_name}'. LastErr={last_err}"
    )


# ---------------- expected model ----------------
@dataclass
class Product:
    name: str
    price: float
    qty: float
    direct_cost_per_unit: float

    @property
    def revenue_monthly(self) -> float:
        return self.price * self.qty

    @property
    def direct_cost_monthly(self) -> float:
        return self.direct_cost_per_unit * self.qty


@dataclass
class Inputs:
    products: List[Product]
    exp_cost_of_sales: float  # עלויות מכר (סה"כ חודשי)
    exp_fixed: float          # הוצאות הנהלה וכלליות (סה"כ חודשי)

    @property
    def revenue_monthly(self) -> float:
        return sum(p.revenue_monthly for p in self.products)

    @property
    def revenue_yearly(self) -> float:
        return self.revenue_monthly * 12

    @property
    def production_cost_monthly(self) -> float:
        return sum(p.direct_cost_monthly for p in self.products)

    @property
    def production_cost_yearly(self) -> float:
        return self.production_cost_monthly * 12

    @property
    def cost_of_sales_yearly(self) -> float:
        return self.exp_cost_of_sales * 12

    @property
    def fixed_yearly(self) -> float:
        return self.exp_fixed * 12

    @property
    def gross_profit_monthly(self) -> float:
        # רווח גולמי = הכנסות - עלות ייצור - עלויות מכר
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

    # ✅ קלט עם "בשר" (2 מוצרים + הוצאות)
    inp = Inputs(
        products=[
            Product(name="מוצר A", price=120, qty=8, direct_cost_per_unit=40),   # rev 960, direct 320
            Product(name="מוצר B", price=75,  qty=20, direct_cost_per_unit=15),  # rev 1500, direct 300
        ],
        exp_cost_of_sales=1500 + 5000 + 200,  # שכירות משרד + משכורות + ארנונה
        exp_fixed=300 + 250 + 400,            # רואה חשבון + הנהלת חשבונות + שיווק
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
        wait_after_register(driver, timeout=40)

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

        for p in inp.products:
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
        fill_expense_card_amount(driver, "שכירות משרד", 1500, timeout=50)
        fill_expense_card_amount(driver, "משכורות עובדים", 5000, timeout=50)
        fill_expense_card_amount(driver, "ארנונה", 200, timeout=50)
        click_button_contains(driver, "המשך לשלב הבא")

        # --- Step 4 ---
        wait_text(driver, "הוצאות קבועות")
        log("Step 4: הוצאות קבועות")
        fill_expense_card_amount(driver, "רואה חשבון", 300, timeout=50)
        fill_expense_card_amount(driver, "הנהלת חשבונות", 250, timeout=50)
        fill_expense_card_amount(driver, "שיווק", 400, timeout=50)
        click_button_contains(driver, "סיום והצגת דוח")

        # --- Report ---
        log("Wait report")
        wait_text(driver, "דוח", timeout=60)
        safe_screenshot(driver, "report_reached.png")

        # ===== Assertions: כרטיסים שנתיים (לפי ה-UI בצילום מסך) =====
        ui_rev_y  = find_card_value_by_title(driver, 'סה"כ הכנסות שנתי')
        ui_prod_y = find_card_value_by_title(driver, "סה\"כ עלויות ייצור שנתי")
        ui_cos_y  = find_card_value_by_title(driver, 'סה"כ הוצאות קבועות (עלות מכר) שנתי')
        ui_fix_y  = find_card_value_by_title(driver, 'סה"כ הוצאות הנהלה וכלליות שנתי')
        ui_gp_y   = find_card_value_by_title(driver, "רווח גולמי שנתי")
        ui_op_y   = find_card_value_by_title(driver, "רווח תפעולי שנתי")

        log(f"UI yearly revenue: {ui_rev_y}")
        log(f"UI yearly prod cost: {ui_prod_y}")
        log(f"UI yearly COS: {ui_cos_y}")
        log(f"UI yearly fixed: {ui_fix_y}")
        log(f"UI yearly gross profit: {ui_gp_y}")
        log(f"UI yearly operating profit: {ui_op_y}")

        assert_close(ui_rev_y,  inp.revenue_yearly,         "Revenue yearly")
        assert_close(ui_prod_y, inp.production_cost_yearly, "Production cost yearly")
        assert_close(ui_cos_y,  inp.cost_of_sales_yearly,   "Cost of sales yearly")
        assert_close(ui_fix_y,  inp.fixed_yearly,           "Fixed yearly")
        assert_close(ui_gp_y,   inp.gross_profit_yearly,    "Gross profit yearly")
        assert_close(ui_op_y,   inp.operating_profit_yearly,"Operating profit yearly")

        # ===== Assertions: טבלת חודשים (בדיקת ינואר) =====
        month = "ינואר"

        ui_rev_m_table  = find_table_value_by_row_and_month(driver, "סה\"כ הכנסה חודשית", month)
        ui_prod_m_table = find_table_value_by_row_and_month(driver, "סה\"כ עלויות ייצור", month)
        ui_cos_m_table  = find_table_value_by_row_and_month(driver, "סה\"כ הוצאות קבועות", month)
        ui_fix_m_table  = find_table_value_by_row_and_month(driver, "סה\"כ הנהלה וכלליות", month)

        log(f"UI table {month} revenue: {ui_rev_m_table}")
        log(f"UI table {month} prod: {ui_prod_m_table}")
        log(f"UI table {month} COS: {ui_cos_m_table}")
        log(f"UI table {month} fixed: {ui_fix_m_table}")

        assert_close(ui_rev_m_table,  inp.revenue_monthly,         f"Revenue monthly ({month})")
        assert_close(ui_prod_m_table, inp.production_cost_monthly, f"Production cost monthly ({month})")
        assert_close(ui_cos_m_table,  inp.exp_cost_of_sales,       f"Cost of sales monthly ({month})")
        assert_close(ui_fix_m_table,  inp.exp_fixed,               f"Fixed monthly ({month})")

        log("✅ PASS - report matches input calculations (cards + ינואר בטבלה)")

    finally:
        try:
            driver.quit()
        except Exception:
            pass


if __name__ == "__main__":
    test_report_matches_input_front_only()
