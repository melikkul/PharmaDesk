"""
Alliance Healthcare Scrapper Microservice
FastAPI application with Playwright for automated login and barem fetching.
"""
import os
import json
import asyncio
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from bs4 import BeautifulSoup


# ============================================================================
# Configuration
# ============================================================================
ALLIANCE_BASE_URL = "https://esiparisv2.alliance-healthcare.com.tr"
PHARMACY_CODE = os.getenv("ALLIANCE_PHARMACY_CODE", "")
USERNAME = os.getenv("ALLIANCE_USERNAME", "")
PASSWORD = os.getenv("ALLIANCE_PASSWORD", "")


# ============================================================================
# Response Models
# ============================================================================
class BaremInfo(BaseModel):
    Vade: int
    MinimumAdet: int = 1
    MalFazlasi: Optional[str] = ""
    IskontoKurum: float = 0.0
    IskontoTicari: float = 0.0
    BirimFiyat: float = 0.0
    Warehouse: str = "Alliance"
    Discount: float = 0.0


class BaremResponse(BaseModel):
    success: bool
    item_id: int
    name: Optional[str] = None
    barcode: Optional[str] = None
    barems: List[BaremInfo] = []
    error: Optional[str] = None
    fetched_at: str = ""


class HealthResponse(BaseModel):
    status: str
    browser_ready: bool
    logged_in: bool
    last_login_at: Optional[str] = None


# ============================================================================
# Session Manager
# ============================================================================
class SessionManager:
    """Manages Playwright browser session with auto-login."""
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.logged_in = False
        self.last_login_at: Optional[str] = None
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize browser with stealth configuration and login."""
        print("🚀 Initializing Playwright browser with stealth mode...")
        self.playwright = await async_playwright().start()
        
        # Launch with stealth-like args
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-web-security',
                '--allow-running-insecure-content',
            ]
        )
        
        # Create context with realistic browser fingerprint
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='tr-TR',
            timezone_id='Europe/Istanbul',
            extra_http_headers={
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            }
        )
        
        # Mask automation detection
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['tr-TR', 'tr', 'en-US', 'en']
            });
            window.chrome = { runtime: {} };
        """)
        
        self.page = await self.context.new_page()
        print("✅ Browser initialized with stealth mode")
        
        # Attempt login
        await self.login()
    
    async def login(self):
        """Perform login to Alliance Healthcare with retry logic."""
        if not all([PHARMACY_CODE, USERNAME, PASSWORD]):
            print("⚠️ Missing credentials, skipping login")
            return False
        
        async with self._lock:
            for attempt in range(3):
                try:
                    print(f"🔐 Login attempt {attempt + 1}/3 as {USERNAME}...")
                    
                    # Navigate to login page - base URL is the login page
                    await self.page.goto(
                        ALLIANCE_BASE_URL,  # Base URL is the login page 
                        wait_until="load",
                        timeout=60000
                    )
                    
                    # Wait for JavaScript to render - wait up to 15 seconds for any input
                    print("⏳ Waiting for page JavaScript to render...")
                    try:
                        await self.page.wait_for_selector('input', timeout=15000)
                    except:
                        print("⚠️ No input fields appeared after 15s")
                    
                    await asyncio.sleep(3)
                    
                    # Debug: Print page title and URL
                    print(f"📄 Page title: {await self.page.title()}")
                    print(f"📄 Page URL: {self.page.url}")
                    
                    # Debug: Capture screenshot and HTML on first attempt
                    if attempt == 0:
                        try:
                            await self.page.screenshot(path="/app/debug_login.png")
                            print("📷 Screenshot saved to /app/debug_login.png")
                        except Exception as e:
                            print(f"⚠️ Screenshot failed: {e}")
                        
                        # Save HTML content
                        try:
                            html_content = await self.page.content()
                            with open("/app/debug_page.html", "w") as f:
                                f.write(html_content)
                            print(f"📝 HTML saved to /app/debug_page.html ({len(html_content)} bytes)")
                            print(f"📝 First 500 chars: {html_content[:500]}")
                        except Exception as e:
                            print(f"⚠️ HTML dump failed: {e}")
                    
                    # Debug: List all visible input fields
                    inputs = await self.page.locator('input').all()
                    print(f"📋 Found {len(inputs)} input fields on page")
                    for i, inp in enumerate(inputs[:10]):  # Show first 10
                        try:
                            name = await inp.get_attribute('name') or ''
                            inp_id = await inp.get_attribute('id') or ''
                            inp_type = await inp.get_attribute('type') or ''
                            placeholder = await inp.get_attribute('placeholder') or ''
                            visible = await inp.is_visible()
                            print(f"  [{i}] name='{name}' id='{inp_id}' type='{inp_type}' placeholder='{placeholder}' visible={visible}")
                        except:
                            pass
                    try:
                        eczane_tab = self.page.locator('a:has-text("Eczane Girişi"), [data-toggle="tab"]:has-text("Eczane")')
                        if await eczane_tab.count() > 0:
                            await eczane_tab.first.click()
                            await asyncio.sleep(1)
                            print("📋 Clicked Eczane Girişi tab")
                    except Exception as e:
                        print(f"⚠️ Could not click Eczane tab: {e}")
                    
                    # Try multiple selectors for form fields
                    eczane_kodu_selectors = [
                        'input[name="EczaneKodu"]',
                        'input#EczaneKodu',
                        'input[placeholder*="Eczane"]',
                        '#pharmacyLoginForm input[type="text"]:first-of-type'
                    ]
                    
                    kullanici_selectors = [
                        'input[name="KullaniciAdi"]',
                        'input#KullaniciAdi',
                        'input[placeholder*="Kullanıcı"]',
                        '#pharmacyLoginForm input[type="text"]:nth-of-type(2)'
                    ]
                    
                    sifre_selectors = [
                        'input[name="Sifre"]',
                        'input#Sifre',
                        'input[type="password"]'
                    ]
                    
                    # Fill Eczane Kodu
                    for selector in eczane_kodu_selectors:
                        try:
                            field = self.page.locator(selector)
                            if await field.count() > 0:
                                await field.first.fill(PHARMACY_CODE)
                                print(f"✅ Filled Eczane Kodu with selector: {selector}")
                                break
                        except:
                            continue
                    
                    # Fill Kullanici Adi
                    for selector in kullanici_selectors:
                        try:
                            field = self.page.locator(selector)
                            if await field.count() > 0:
                                await field.first.fill(USERNAME)
                                print(f"✅ Filled Kullanıcı Adı with selector: {selector}")
                                break
                        except:
                            continue
                    
                    # Fill Sifre
                    for selector in sifre_selectors:
                        try:
                            field = self.page.locator(selector)
                            if await field.count() > 0:
                                await field.first.fill(PASSWORD)
                                print(f"✅ Filled Şifre with selector: {selector}")
                                break
                        except:
                            continue
                    
                    await asyncio.sleep(1)
                    
                    # Submit form - try multiple selectors
                    submit_selectors = [
                        'button[type="submit"]',
                        'input[type="submit"]',
                        '#pharmacyLoginForm button',
                        'button:has-text("Giriş")',
                        '.btn-login'
                    ]
                    
                    for selector in submit_selectors:
                        try:
                            btn = self.page.locator(selector)
                            if await btn.count() > 0:
                                await btn.first.click()
                                print(f"✅ Clicked submit with selector: {selector}")
                                break
                        except:
                            continue
                    
                    # Wait for navigation with timeout
                    try:
                        await self.page.wait_for_load_state("networkidle", timeout=30000)
                    except:
                        await asyncio.sleep(5)
                    
                    # Check if login was successful - URL should change from base URL
                    current_url = self.page.url
                    base_url_clean = ALLIANCE_BASE_URL.rstrip('/')
                    current_url_clean = current_url.rstrip('/').split('?')[0]  # Remove query params
                    
                    # Handle UniqueLogin page (another session exists)
                    if "UniqueLogin" in current_url:
                        print("⚠️ Another session exists - clicking 'Aktif Oturumları Kapat'")
                        try:
                            # Click "Aktif Oturumları Kapat" button repeatedly until normal page loads
                            for click_attempt in range(5):  # Try up to 5 times
                                close_btn = self.page.locator('button:has-text("Aktif Oturumları Kapat"), a:has-text("Aktif Oturumları Kapat"), .btn:has-text("Aktif Oturumları Kapat")')
                                if await close_btn.count() > 0:
                                    await close_btn.first.click()
                                    await asyncio.sleep(2)
                                    print(f"   Clicked 'Aktif Oturumları Kapat' (attempt {click_attempt + 1})")
                                    
                                    # Wait for page to load
                                    try:
                                        await self.page.wait_for_load_state("networkidle", timeout=10000)
                                    except:
                                        pass
                                    
                                    # Check if we're on main page now
                                    new_url = self.page.url
                                    if "MainPage" in new_url or ("Home" in new_url and "UniqueLogin" not in new_url):
                                        self.logged_in = True
                                        self.last_login_at = datetime.now().isoformat()
                                        print(f"✅ Login successful after closing active sessions!")
                                        return True
                                    
                                    if "UniqueLogin" not in new_url:
                                        # Different page, stop trying
                                        break
                                else:
                                    break  # Button not found
                                    
                        except Exception as e:
                            print(f"⚠️ Failed to handle UniqueLogin: {e}")
                    
                    # Success if URL is different from base URL (login page) and contains MainPage or Home
                    if ("MainPage" in current_url or ("Home" in current_url and "UniqueLogin" not in current_url)):
                        self.logged_in = True
                        self.last_login_at = datetime.now().isoformat()
                        print(f"✅ Login successful! Redirected to: {current_url}")
                        return True
                    elif current_url_clean != base_url_clean and "UniqueLogin" not in current_url:
                        # Some other dashboard page
                        self.logged_in = True
                        self.last_login_at = datetime.now().isoformat()
                        print(f"✅ Login successful! Redirected to: {current_url}")
                        return True
                    else:
                        print(f"⚠️ Still on login page: {current_url}")
                        
                        # Check for error messages
                        try:
                            error = self.page.locator('.alert-danger, .error-message, .validation-summary-errors, .text-danger')
                            if await error.count() > 0:
                                error_text = await error.first.text_content()
                                print(f"❌ Login error message: {error_text}")
                        except:
                            pass
                        
                except Exception as e:
                    print(f"❌ Login attempt {attempt + 1} error: {e}")
                
                # Wait before retry
                if attempt < 2:
                    print(f"⏳ Waiting 5 seconds before retry...")
                    await asyncio.sleep(5)
            
            print("❌ All login attempts failed")
            self.logged_in = False
            return False
    
    async def ensure_logged_in(self):
        """Ensure we're logged in, re-login if needed."""
        if not self.logged_in or not self.page:
            return await self.login()
        
        # Check if session is still valid - if on base URL, session expired
        try:
            current_url = self.page.url.rstrip('/').split('?')[0]
            base_url = ALLIANCE_BASE_URL.rstrip('/')
            if current_url == base_url or current_url == base_url + "/":
                print("🔄 Session expired, re-logging in...")
                return await self.login()
        except:
            return await self.login()
        
        return True
    
    async def fetch_barem(self, item_id: int) -> BaremResponse:
        """Fetch barem data for an item using search on main page."""
        response = BaremResponse(
            success=False,
            item_id=item_id,
            fetched_at=datetime.now().isoformat()
        )
        
        if not await self.ensure_logged_in():
            response.error = "Not logged in"
            return response
        
        async with self._lock:
            try:
                print(f"📡 Fetching barem for item {item_id}...")
                
                # Make sure we're on a valid page (MainPage or QuickOrder)
                current_url = self.page.url
                if "MainPage" not in current_url and "QuickOrder" not in current_url:
                    await self.page.goto(
                        f"{ALLIANCE_BASE_URL}/Home/MainPage",
                        wait_until="networkidle"
                    )
                    await asyncio.sleep(1)
                
                # Use the correct API: POST /Sales/ItemDetailv3
                print(f"📋 Calling POST /Sales/ItemDetailv3 for item {item_id}...")
                
                api_url = f"{ALLIANCE_BASE_URL}/Sales/ItemDetailv3"
                
                # Make POST request with itemId in body
                api_response = await self.page.evaluate(f'''
                    async () => {{
                        try {{
                            const response = await fetch("{api_url}", {{
                                method: "POST",
                                credentials: "include",
                                headers: {{
                                    "Content-Type": "application/json; charset=utf-8",
                                    "X-Requested-With": "XMLHttpRequest",
                                    "Accept": "*/*"
                                }},
                                body: JSON.stringify({{ itemId: {item_id} }})
                            }});
                            if (response.ok) {{
                                const html = await response.text();
                                return {{ success: true, html: html, status: response.status }};
                            }} else {{
                                return {{ success: false, status: response.status, error: "HTTP " + response.status }};
                            }}
                        }} catch (e) {{
                            return {{ success: false, error: e.message }};
                        }}
                    }}
                ''')
                
                if api_response and api_response.get("success"):
                    html = api_response.get("html", "")
                    print(f"   ✅ Got HTML response ({len(html)} bytes)")
                    
                    # Save HTML for debugging
                    try:
                        with open("/app/debug_barem.html", "w") as f:
                            f.write(html)
                        print(f"   📄 Saved to /app/debug_barem.html")
                    except:
                        pass
                    
                    # Parse HTML to extract barem data
                    # The HTML contains a table with barem information
                    barems = self._parse_barem_html(html, item_id)
                    response.barems = barems
                    
                    if barems:
                        print(f"   ✅ Parsed {len(barems)} barems from HTML!")
                    else:
                        print(f"   ⚠️ No barems found in HTML")
                        
                else:
                    error = api_response.get("error", "Unknown error") if api_response else "No response"
                    print(f"   ❌ API call failed: {error}")
                
                response.success = True
                print(f"✅ Found {len(response.barems)} barems for item {item_id}")
                
            except Exception as e:
                print(f"❌ Error fetching barem: {e}")
                response.error = str(e)
        
        return response
    
    def _parse_barem_html(self, html: str, item_id: int) -> list:
        """Parse HTML response to extract barem data using BeautifulSoup."""
        barems = []
        
        try:
            soup = BeautifulSoup(html, 'lxml')
            
            # Find the barem table (id='popup_tblKampanyalar')
            table = soup.find('table', id='popup_tblKampanyalar')
            if not table:
                # Try any table with kampanya in id
                table = soup.find('table', id=lambda x: x and 'kampanya' in x.lower())
            if not table:
                # Fallback to first table
                tables = soup.find_all('table')
                if tables:
                    table = tables[0]
                    print(f"   📋 Using first table (no kampanya table found)")
            
            if table:
                tbody = table.find('tbody')
                rows = tbody.find_all('tr') if tbody else table.find_all('tr')
                
                print(f"   📋 Found {len(rows)} rows in barem table")
                
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 6:  # Full barem row has 7 columns (radio, vade, minadet, mf, kurum, ticari, fiyat)
                        try:
                            # Extract cell values - columns are:
                            # [0] radio button, [1] Vade, [2] Min Adet, [3] MF, [4] Kurum, [5] Ticari, [6] Fiyat
                            vade_text = cells[1].get_text(strip=True) if len(cells) > 1 else "0"
                            min_adet_text = cells[2].get_text(strip=True) if len(cells) > 2 else "1"
                            mf_text = cells[3].get_text(strip=True) if len(cells) > 3 else "0"
                            kurum_text = cells[4].get_text(strip=True) if len(cells) > 4 else ""
                            ticari_text = cells[5].get_text(strip=True) if len(cells) > 5 else ""
                            fiyat_text = cells[6].get_text(strip=True) if len(cells) > 6 else "0"
                            
                            # Parse values
                            vade = int(vade_text) if vade_text.isdigit() else 0
                            min_adet = int(min_adet_text) if min_adet_text.isdigit() else 1
                            mf = mf_text
                            
                            # Parse kurum iskonto (might be empty or have % symbol)
                            kurum_iskonto = 0.0
                            if kurum_text and kurum_text not in ['&nbsp;', '\xa0', '']:
                                kurum_iskonto = float(kurum_text.replace('%', '').replace(',', '.').strip() or '0')
                            
                            # Parse ticari iskonto
                            ticari_iskonto = 0.0
                            if ticari_text and ticari_text not in ['&nbsp;', '\xa0', '']:
                                ticari_iskonto = float(ticari_text.replace('%', '').replace(',', '.').strip() or '0')
                            
                            # Parse fiyat
                            fiyat = 0.0
                            if fiyat_text:
                                fiyat = float(fiyat_text.replace(',', '.').replace(' ', '').strip() or '0')
                            
                            if vade > 0 or fiyat > 0:
                                barem = BaremInfo(
                                    Vade=vade,
                                    MinimumAdet=min_adet,
                                    MalFazlasi=mf,
                                    IskontoKurum=kurum_iskonto,
                                    IskontoTicari=ticari_iskonto,
                                    BirimFiyat=fiyat,
                                    Warehouse="Alliance",
                                    Discount=max(kurum_iskonto, ticari_iskonto)
                                )
                                barems.append(barem)
                                print(f"   📦 Barem: Vade={vade}, MinAdet={min_adet}, Fiyat={fiyat}")
                                
                        except Exception as e:
                            print(f"   ⚠️ Error parsing row: {e}")
                            continue
            else:
                print(f"   ⚠️ No barem table found in HTML")
                            
        except Exception as e:
            print(f"   ⚠️ HTML parsing error: {e}")
        
        # Remove duplicate barems based on key fields (Vade, MinimumAdet, MalFazlasi, BirimFiyat)
        unique_barems = []
        seen_keys = set()
        for barem in barems:
            # Create a unique key from key fields
            key = (barem.Vade, barem.MinimumAdet, barem.MalFazlasi, barem.BirimFiyat)
            if key not in seen_keys:
                seen_keys.add(key)
                unique_barems.append(barem)
        
        if len(barems) != len(unique_barems):
            print(f"   🔄 Removed {len(barems) - len(unique_barems)} duplicate barems")
        
        return unique_barems
    
    async def close(self):
        """Clean up browser resources."""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()


# ============================================================================
# FastAPI Application
# ============================================================================
session_manager = SessionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    await session_manager.initialize()
    yield
    # Shutdown
    await session_manager.close()


app = FastAPI(
    title="Alliance Healthcare Scrapper",
    description="Microservice for fetching barem data from Alliance Healthcare",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy" if session_manager.browser else "starting",
        browser_ready=session_manager.browser is not None,
        logged_in=session_manager.logged_in,
        last_login_at=session_manager.last_login_at
    )


@app.get("/get-barem/{item_id}")
async def get_barem(item_id: int):
    """Fetch barem data for an item."""
    if not session_manager.browser:
        raise HTTPException(status_code=503, detail="Browser not ready")
    
    result = await session_manager.fetch_barem(item_id)
    return result


@app.post("/login")
async def trigger_login():
    """Manually trigger login."""
    success = await session_manager.login()
    return {"success": success, "logged_in": session_manager.logged_in}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Alliance Healthcare Scrapper",
        "version": "1.0.0",
        "status": "running"
    }
