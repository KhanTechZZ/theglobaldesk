/* =========================================================
   THE GLOBAL DESK
   INTERACTIVE NEWSROOM ENGINE
   ========================================================= */


/* =========================================================
   NEWS DATABASE
   পরে Google Sheets/API দিয়ে replace করা যাবে
   ========================================================= */

const newsDatabase = [

    {
        category: "World",
        title: "A changing world is reshaping the international order",
        description:
            "Governments, markets and communities are adapting to a rapidly changing global landscape.",
        image:
            "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
        time: "18 min ago"
    },

    {
        category: "Asia",
        title: "Asia takes centre stage in the global economic conversation",
        description:
            "Economic growth, trade and strategic connectivity continue to shape the region's growing influence.",
        image:
            "https://images.unsplash.com/photo-1535139262971-c51845709a48?auto=format&fit=crop&w=900&q=80",
        time: "32 min ago"
    },

    {
        category: "Business",
        title: "Markets watch new signals from the global economy",
        description:
            "Investors are closely watching policy decisions and economic indicators across major markets.",
        image:
            "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80",
        time: "41 min ago"
    },

    {
        category: "Technology",
        title: "Artificial intelligence enters a new phase of global competition",
        description:
            "Technology companies and governments are accelerating investment in next-generation AI infrastructure.",
        image:
            "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=80",
        time: "1 hr ago"
    },

    {
        category: "Science",
        title: "Researchers explore new frontiers in climate and energy science",
        description:
            "Scientific institutions are expanding research into cleaner energy and environmental resilience.",
        image:
            "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80",
        time: "1 hr ago"
    },

    {
        category: "Climate",
        title: "Climate adaptation becomes a central global policy challenge",
        description:
            "Cities and coastal communities are investing in infrastructure designed for a changing climate.",
        image:
            "https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?auto=format&fit=crop&w=900&q=80",
        time: "2 hrs ago"
    },

    {
        category: "Politics",
        title: "Diplomatic activity intensifies across key global regions",
        description:
            "International diplomacy remains focused on security, trade and long-term cooperation.",
        image:
            "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80",
        time: "2 hrs ago"
    },

    {
        category: "World",
        title: "Why the next decade could redefine global connectivity",
        description:
            "New transport, digital and economic corridors are changing how countries interact.",
        image:
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
        time: "3 hrs ago"
    }

];


/* =========================================================
   BREAKING NEWS
   ========================================================= */

const breakingStories = [

    "Global markets react to the latest economic signals as investors assess the outlook.",

    "International leaders continue diplomatic discussions on major regional developments.",

    "Asia remains a key focus as trade, technology and infrastructure reshape global connectivity.",

    "The Global Desk is monitoring developments across major international newsrooms.",

    "Scientists and policymakers continue discussions around climate resilience and energy."
];

let breakingIndex = 0;


/* =========================================================
   CLOCK
   ========================================================= */

function updateClock() {

    const clock = document.getElementById("liveClock");
    const date = document.getElementById("currentDate");

    if (!clock) return;

    const now = new Date();

    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");

    clock.textContent =
        `${hours}:${minutes}:${seconds} UTC`;

    if (date) {

        date.textContent =
            now.toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC"
                }
            ).toUpperCase();

    }
}

updateClock();

setInterval(updateClock, 1000);


/* =========================================================
   BREAKING NEWS ROTATION
   ========================================================= */

function showBreakingNews() {

    const element =
        document.getElementById("breakingNews");

    if (!element) return;

    element.classList.add("switching");

    setTimeout(() => {

        element.textContent =
            breakingStories[breakingIndex];

        element.classList.remove("switching");

    }, 230);

    breakingIndex++;

    if (breakingIndex >= breakingStories.length) {
        breakingIndex = 0;
    }
}


setInterval(showBreakingNews, 6500);


document
    .getElementById("breakingNext")
    ?.addEventListener("click", showBreakingNews);


/* =========================================================
   HERO NEWS
   ========================================================= */

function renderHero() {

    const container =
        document.getElementById("heroGrid");

    if (!container) return;

    const hero = newsDatabase[0];

    const sideStories =
        newsDatabase.slice(1, 4);

    container.innerHTML = `

        <article class="hero-main">

            <div
                class="hero-main-image"
                style="background-image:url('${hero.image}')">
            </div>

            <div class="hero-content">

                <span class="category-label">
                    ${hero.category.toUpperCase()}
                </span>

                <h2>
                    ${hero.title}
                </h2>

                <p>
                    ${hero.description}
                </p>

                <div class="hero-meta">
                    ${hero.time} · The Global Desk
                </div>

            </div>

        </article>


        <div class="hero-side">

            ${sideStories.map(story => `

                <article class="side-story">

                    <div
                        class="side-image"
                        style="background-image:url('${story.image}')">
                    </div>

                    <div>

                        <span class="section-kicker">
                            ${story.category}
                        </span>

                        <h3>
                            ${story.title}
                        </h3>

                        <p>
                            ${story.time}
                        </p>

                    </div>

                </article>

            `).join("")}

        </div>

    `;
}


/* =========================================================
   LATEST NEWS
   ========================================================= */

function renderLatestNews(data = newsDatabase) {

    const container =
        document.getElementById("latestNews");

    if (!container) return;

    container.innerHTML =
        data.slice(0, 7).map(story => `

            <article class="news-card">

                <div
                    class="news-image"
                    style="background-image:url('${story.image}')">
                </div>

                <div class="news-info">

                    <span class="category-label">
                        ${story.category}
                    </span>

                    <h3>
                        ${story.title}
                    </h3>

                    <p>
                        ${story.description}
                    </p>

                    <div class="news-meta">
                        ${story.time} · Global Desk Newsroom
                    </div>

                </div>

            </article>

        `).join("");
}


/* =========================================================
   MOST READ
   ========================================================= */

function renderMostRead() {

    const container =
        document.getElementById("mostRead");

    if (!container) return;

    const popular =
        newsDatabase.slice(2, 7);

    container.innerHTML =
        popular.map((story, index) => `

            <article class="most-read-item">

                <span class="most-read-number">
                    ${String(index + 1).padStart(2, "0")}
                </span>

                <h3>
                    ${story.title}
                </h3>

            </article>

        `).join("");
}


/* =========================================================
   SEARCH
   ========================================================= */

const searchOverlay =
    document.getElementById("searchOverlay");

const searchInput =
    document.getElementById("searchInput");

const searchResults =
    document.getElementById("searchResults");


function openSearch() {

    if (!searchOverlay) return;

    searchOverlay.classList.add("active");

    setTimeout(() => {
        searchInput?.focus();
    }, 100);

}


function closeSearch() {

    searchOverlay?.classList.remove("active");

}


document
    .getElementById("searchOpen")
    ?.addEventListener("click", openSearch);

document
    .getElementById("searchClose")
    ?.addEventListener("click", closeSearch);


searchOverlay?.addEventListener("click", event => {

    if (event.target === searchOverlay) {
        closeSearch();
    }

});


function performSearch() {

    const query =
        searchInput.value
            .trim()
            .toLowerCase();

    if (!query) {

        searchResults.innerHTML = "";

        return;
    }

    const results =
        newsDatabase.filter(story =>

            story.title.toLowerCase().includes(query) ||

            story.description.toLowerCase().includes(query) ||

            story.category.toLowerCase().includes(query)

        );


    if (!results.length) {

        searchResults.innerHTML = `
            <p style="color:#667383">
                No stories found for "${query}".
            </p>
        `;

        return;
    }


    searchResults.innerHTML =
        results.map(story => `

            <div class="search-result">

                <strong>
                    ${story.title}
                </strong>

                <span>
                    ${story.category} · ${story.time}
                </span>

            </div>

        `).join("");
}


searchInput?.addEventListener(
    "input",
    performSearch
);


/* =========================================================
   DARK MODE
   ========================================================= */

const themeToggle =
    document.getElementById("themeToggle");


function applySavedTheme() {

    const saved =
        localStorage.getItem("globalDeskTheme");

    if (saved === "dark") {

        document.body.classList.add("dark-mode");

        if (themeToggle) {
            themeToggle.textContent = "☀";
        }

    } else {

        document.body.classList.remove("dark-mode");

        if (themeToggle) {
            themeToggle.textContent = "◐";
        }

    }

}


applySavedTheme();


themeToggle?.addEventListener(
    "click",
    () => {

        document.body.classList.toggle("dark-mode");

        const isDark =
            document.body.classList.contains("dark-mode");

        localStorage.setItem(
            "globalDeskTheme",
            isDark ? "dark" : "light"
        );

        themeToggle.textContent =
            isDark ? "☀" : "◐";

    }
);


/* =========================================================
   REFRESH NEWS
   ========================================================= */

document
    .getElementById("refreshNews")
    ?.addEventListener("click", () => {

        const button =
            document.getElementById("refreshNews");

        button.textContent = "Updating...";

        setTimeout(() => {

            renderLatestNews();

            const updateTime =
                document.getElementById("updateTime");

            if (updateTime) {
                updateTime.textContent = "just now";
            }

            button.textContent = "Refresh ↻";

            showToast(
                "Newsroom feed refreshed"
            );

        }, 700);

    });


/* =========================================================
   NEWSLETTER
   ========================================================= */

document
    .getElementById("newsletterForm")
    ?.addEventListener("submit", event => {

        event.preventDefault();

        const email =
            document
                .getElementById("newsletterEmail")
                .value
                .trim();

        if (!email) return;

        showToast(
            "You're on the Global Brief list."
        );

        event.target.reset();

    });


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;

function showToast(message) {

    const toast =
        document.getElementById("toast");

    const toastMessage =
        document.getElementById("toastMessage");

    if (!toast || !toastMessage) return;

    toastMessage.textContent =
        message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(() => {

            toast.classList.remove("show");

        }, 3000);

}


/* =========================================================
   NAV ACTIVE STATE
   ========================================================= */

document
    .querySelectorAll(".nav-link")
    .forEach(link => {

        link.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".nav-link")
                    .forEach(item =>
                        item.classList.remove("active")
                    );

                link.classList.add("active");

            }
        );

    });


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderHero();

        renderLatestNews();

        renderMostRead();

        showBreakingNews();

    }
);