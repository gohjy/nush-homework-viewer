(() => {
    if (location.search) {
        for (let link of document.querySelectorAll(".hero p a")) {
            link.href += location.search;
        }
    }
})();

const OPTIONS = globalThis.__OPTIONS ?? {};
OPTIONS.cardGroupElem ?? (OPTIONS.cardGroupElem = "div");
OPTIONS.cardElem ?? (OPTIONS.cardElem = "div");
OPTIONS.cardContentElem ?? (OPTIONS.cardContentElem = "p");
OPTIONS.breakElem ?? (OPTIONS.breakElem = "div");
console.log(OPTIONS);

const MTLdepts = [
    "BG", "CH", "CL", 
    "GJ", "GM", "UD",
    "HD", "JP", "MH",
    "ML", "PJ", "TH", "TL"
];    

const dateToTime = (dateObj) => {
    return `${
        ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dateObj.getDay()]
    } ${
        dateObj.getDate()
    } ${
        ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dateObj.getMonth()]
    } ${
        dateObj.getFullYear()
    }${
        dateObj.getHours() 
        ? ` ${
            dateObj.getHours().toString().padStart(2, "0")
        }:${
            dateObj.getMinutes().toString().padStart(2, "0")
        }` : ""
    }`;
}

const makeCourseText = ({courseCode, classID, subject}) => courseCode.toUpperCase().slice(0, 2) === "CE" ? `${classID} Mentoring/CCE` : `${courseCode}: ${subject} (${classID})`

const grid = document.querySelector("#grid");
const input = document.querySelector("#urlInput");
const button = document.querySelector("#goBtn");
const errorSpace = document.querySelector("#error");

const newCard = ({subject, courseCode, classID, item}) => {
    const card = document.createElement(OPTIONS.cardElem);
    card.classList.add("card");
    card.classList.add(
        MTLdepts.includes(courseCode.slice(0, 2))
        ? "mt"
        : courseCode.slice(0, 2).toLowerCase()
    );

    const meta = document.createElement(OPTIONS.cardContentElem);
    meta.classList.add("small", "grey", "meta-ind");
    meta.textContent = makeCourseText({courseCode, classID, subject});
    card.append(meta);

    // let cardType = 1;

    if (item.type === "homework" || item.type === "info") {
        const content = document.createElement(OPTIONS.cardContentElem);
        const contentDiv = document.createElement("div");
        const contentLines = (item.content + 
        (item.optional ? " (optional)" : "")).split("\n");
        for (let ix of contentLines) {
            contentDiv.append(ix, document.createElement("br"));
        }
        // content.lastElementChild.remove(); // remove last <br>
        contentDiv.innerHTML = contentDiv.innerHTML.replaceAll(
            /\bhttps\:\/\/v\.gd\/[a-zA-Z0-9_]+/g,
            `<a href="$&-" target="_blank">$&</a>`
        );
        content.append(contentDiv);
        content.classList.add("main-item-content");
        card.append(content);

        if (item.type === "homework") {
            card.classList.add("homework");
            const due = document.createElement(OPTIONS.cardContentElem);
            due.classList.add("small", "due-ind");

            const dueInfoText = document.createElement("span");
            dueInfoText.classList.add("due-info-span");
            dueInfoText.textContent = "Due date:";

            const dueSpan = document.createElement("span");
            dueSpan.classList.add("due-span");
            dueSpan.textContent = item.dueDate ? dateToTime(new Date(item.dueDate + "+08:00")) : "Unknown";

            due.append(dueInfoText, " ", dueSpan);
            card.append(due);
        } else if (item.type === "info") {
            card.classList.add("info");
        }

        card.dataset.courseCode = courseCode;
    }

    return card;

    /* if (cardType) {
        if (grid.lastElementChild && grid.lastElementChild.dataset.courseCode !== courseCode) {
            const breakElem = document.createElement("div");
            breakElem.classList.add("break");
            grid.append(breakElem);
        } 
        grid.append(card);
    }; */
}

const fetchData = async (url) => {
    return await fetch(url)
    .catch(() => {throw new Error("Network error")})
    .then((resp) => {
        if (!resp.ok) {
            if (resp.status === 404) {
                throw new Error("URL does not exist");
            } else {
                throw new Error(`${resp.status} ${resp.statusText}`);
            }
        } else {
            return resp.json().catch(() => {
                throw new Error("Malformed data");
            });
        }
    })
    .catch(e => ({[Symbol.for("error")]: true, "message": e.message}));
}

const loadData = async () => {
    const url = urlInput.value.trim();
    if (!url) {
        errorSpace.textContent = "URL must be provided";
        return;
    } else if (!url.match(/^https?\:\/\//)) {
        errorSpace.textContent = "URL must start with https://";
        return;
    }
    let data = await fetchData(url);
    if (data[Symbol.for("error")]) {
        errorSpace.textContent = data.message;
        return;
    }

    if (!data["class"] || !data.lastUpdate || !data.url || !data.homeworkData || !data.homeworkData[Symbol.iterator]) {
        errorSpace.textContent = "Malformed data";
        return;
    }

    grid.innerHTML = "";

    for (let obj of data.homeworkData.sort(
        (a, b) => {
            const x = ((a, b) => {
                if (a.courseCode.match(/^ce/i)) return -1;
                if (b.courseCode.match(/^ce/i)) return 1;
                if (a.courseCode > b.courseCode) return 1;
                if (a.courseCode === b.courseCode) return 0;
                return -1;
            })(a, b);
            
            console.log(x, a.courseCode, b.courseCode);
            return x;
        }
    )) {
        console.info(obj);
        if (obj.proxy) {

        }

        if (!obj.items.length) continue;

        const subjectCardsHolder = document.createElement("div");
        subjectCardsHolder.classList.add("subject-group");

        const infoBox = document.createElement("div");
        infoBox.classList.add("group-info-box");
        infoBox.textContent = makeCourseText(obj);
        subjectCardsHolder.append(infoBox);

        const cardsHolder = document.createElement(OPTIONS.cardGroupElem);
        cardsHolder.classList.add("card-group");

        for (let item of obj.items.sort((a, b) => {
            const sortOrder = ["info", "homework"];
            return sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type);
        })) {
            console.log(item);            

            cardsHolder.append(newCard({
                subject: obj.subject,
                courseCode: obj.courseCode,
                classID: obj.classID,
                item: item
            }));
        }
        
        subjectCardsHolder.append(cardsHolder);
        grid.append(subjectCardsHolder);

        const breakElem = document.createElement(OPTIONS.breakElem);
        breakElem.classList.add("break");
        grid.append(breakElem);
    }
    grid.lastElementChild.remove();
    errorSpace.textContent = "";
    document.querySelector("#shareCont").classList.remove("invisible");

    const shareUrl = new URL(location.href);
    shareUrl.searchParams.set("src", url);
    document.querySelector("#shareLink").value = shareUrl.href;

    return true;
}

button.addEventListener("click", async () => {
    urlInput.disabled = true;
    button.disabled = true;
    try { 
        await loadData();
    } catch(e) {
        errorSpace.textContent = "Something went wrong. " + e.message;
    }
    urlInput.disabled = false;
    button.disabled = false;
});

const starter = new URL(location.href).searchParams.get("src");
if (starter) {
    urlInput.value = starter;
    button.click();
}