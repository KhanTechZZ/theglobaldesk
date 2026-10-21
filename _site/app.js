/* =========================================================
   THE GLOBAL DESK — MAIN ENGINE
   ========================================================= */

/* ---------- 1. LIVE DATE & TIME ---------- */
function updateClock() {
    const clock = document.getElementById("liveTime");
    const date = document.getElementById("liveDate");
    if (!clock) return;
    const now = new Date();
    const utcH = String(now.getUTCHours()).padStart(2, "0");
    const utcM = String(now.getUTCMinutes()).padStart(2, "0");
    const utcS = String(now.getUTCSeconds()).padStart(2, "0");
    const localH = String(now.getHours()).padStart(2, "0");
    const localM = String(now.getMinutes()).padStart(2, "0");
    const localS = String(now.getSeconds()).padStart(2, "0");
    const localTz = Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
        .formatToParts(now).find(p => p.type === "timeZoneName")?.value || "";
    clock.innerHTML = `${utcH}:${utcM}:${utcS} UTC <span class="util-divider">|</span> ${localH}:${localM}:${localS} ${localTz}`;
    if (date) {
        date.textContent = now.toLocaleDateString("en-US", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric"
        }).toUpperCase();
    }
}
updateClock();
setInterval(updateClock, 1000);


/* ---------- 2. STICKY HEADER ---------- */
const siteHeader = document.getElementById("siteHeader");
let ticking = false;
window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (!ticking) {
        window.requestAnimationFrame(() => {
            if (current > 200) siteHeader?.classList.add("scrolled");
            else if (current < 100) siteHeader?.classList.remove("scrolled");
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });


/* ---------- 3. DROPDOWN MENU (FAST POSITIONING) ---------- */
const dropdown = document.getElementById("dropdown");
const dropdownBtn = document.getElementById("dropdownBtn");

dropdownBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dropdown.classList.contains("open")) {
        dropdown.classList.remove("open");
        return;
    }
    
    // Position calculation happens instantly before animation starts
    if (window.innerWidth <= 800) {
        const rect = dropdownBtn.getBoundingClientRect();
        const content = dropdown.querySelector('.dropdown-content');
        if (content) {
            // Open exactly 5px below the button
            content.style.top = (rect.bottom + 5) + 'px';
            // Align to the right edge of the button
            let rightPos = window.innerWidth - rect.right;
            if (rightPos < 10) rightPos = 10; 
            content.style.right = rightPos + 'px';
            content.style.left = 'auto';
        }
    } else {
        // Reset inline styles on desktop
        const content = dropdown.querySelector('.dropdown-content');
        if (content) {
            content.style.top = '';
            content.style.right = '';
            content.style.left = '';
        }
    }
    
    dropdown.classList.add("open");
});

document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove("open");
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dropdown?.classList.remove("open");
});

window.addEventListener("scroll", () => {
    if (window.innerWidth <= 800) dropdown?.classList.remove("open");
}, { passive: true });


/* ---------- 4. BREAKING NEWS ---------- */
let breakingStories = [{ title: "The Global Desk — Live", url: "/" }];
let breakingIndex = 0;

async function loadBreakingNews() {
    try {
        const response = await fetch("/breaking.json");
        if (!response.ok) return;
        const data = await response.json();
        const now = new Date();
        const active = data.filter(item => !item.expires || new Date(item.expires) > now);
        if (active.length) {
            breakingStories = active.map(item => ({ title: item.title, url: item.url || "/" }));
        }
    } catch (e) { console.error("Breaking news load error:", e); }
}

function showBreakingNews() {
    const link = document.getElementById("breakingLink");
    const wrap = document.getElementById("breakingNews");
    if (!link || !wrap) return;
    wrap.classList.add("switching");
    setTimeout(() => {
        const story = breakingStories[breakingIndex];
        link.textContent = story.title;
        link.href = story.url;
        wrap.classList.remove("switching");
    }, 230);
    breakingIndex++;
    if (breakingIndex >= breakingStories.length) breakingIndex = 0;
}

const breakingBar = document.getElementById("breakingBar");
let breakingTimer = setInterval(showBreakingNews, 6500);
breakingBar?.addEventListener("mouseenter", () => clearInterval(breakingTimer));
breakingBar?.addEventListener("mouseleave", () => {
    clearInterval(breakingTimer);
    breakingTimer = setInterval(showBreakingNews, 6500);
});
document.getElementById("breakingNext")?.addEventListener("click", showBreakingNews);
loadBreakingNews().then(() => showBreakingNews());


/* ---------- 5. TIME AGO ---------- */
function timeAgo(dateString) {
    if (!dateString) return "";
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}
function updateAllTimes() {
    document.querySelectorAll("[data-published]").forEach(el => {
        const dateStr = el.getAttribute("data-published");
        if (dateStr) el.textContent = timeAgo(dateStr);
    });
}
updateAllTimes();
setInterval(updateAllTimes, 60000);


/* ---------- 6. ARTICLE PAGE ---------- */
const articleBody = document.querySelector(".article-body");
if (articleBody) {
    const text = articleBody.innerText || "";
    const wordCount = text.trim().split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);
    const readTimeEl = document.getElementById("readingTime");
    if (readTimeEl) readTimeEl.textContent = `${readTime} min read`;

    const pageUrl = encodeURIComponent(window.location.href);
    const pageTitle = encodeURIComponent(document.title);

    const shareX = document.getElementById("shareX");
    const shareFB = document.getElementById("shareFB");
    const shareWA = document.getElementById("shareWA");
    const shareCopy = document.getElementById("shareCopy");

    if (shareX) shareX.href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
    if (shareFB) shareFB.href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    if (shareWA) shareWA.href = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;

    shareCopy?.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast("Link copied to clipboard!");
        });
    });
}


/* ---------- 7. DARK MODE ---------- */
const themeToggle = document.getElementById("themeToggle");
if (localStorage.getItem("globalDeskTheme") === "dark") {
    document.body.classList.add("dark-mode");
    if (themeToggle) themeToggle.textContent = "☀";
}
themeToggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("globalDeskTheme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "☀" : "◐";
});


/* ---------- 8. TOAST ---------- */
let toastTimer;
function showToast(message) {
    const toast = document.getElementById("toast");
    const msg = document.getElementById("toastMessage");
    if (!toast || !msg) return;
    msg.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}