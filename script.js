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
    }`;
}

const grid = document.querySelector("#grid");
const input = document.querySelector("#urlInput");
const button = document.querySelector("#goBtn");
const errorSpace = document.querySelector("#error");

const newCard = ({subject, courseCode, classId, item}) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.classList.add(
        MTLdepts.includes(courseCode.slice(0, 2))
        ? "mt"
        : courseCode.slice(0, 2).toLowerCase()
    );

    const meta = document.createElement("p");
    meta.classList.add("small", "grey");
    meta.textContent = `${courseCode}: ${subject} (${classId})`;
    card.append(meta);

    let cardType = 1;

    if (item.type === "homework" || item.type === "info") {
        const content = document.createElement("p");
        content.textContent = item.content + 
        (item.optional ? " (optional)" : "");
        content.innerHTML = content.innerHTML.replaceAll(
            /https\:\/\/v\.gd\/[a-zA-z0-9_]+/g,
            `<a href="$&-" target="_blank">$&</a>`
        );
        card.append(content);

        if (item.type === "homework") {
            const due = document.createElement("p");
            due.textContent = `Due date: ${dateToTime(new Date(item.dueDate + "+08:00"))}`;
            card.append(due);
        } else if (item.type === "info") {
            card.classList.add("info");
        }

        card.dataset.courseCode = courseCode;
    }

    if (cardType) {
        /*if (grid.lastElementChild && grid.lastElementChild.dataset.courseCode !== courseCode) {
            const breakElem = document.createElement("div");
            breakElem.classList.add("break");
            breakElem.innerHTML = "&nbsp;";
            grid.append(breakElem);
        } */
        grid.append(card);
    };
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
        (a, b) => a.courseCode > b.courseCode ? 1 : (a.courseCode === b.courseCode ? 0 : -1)
    )) {
        if (obj.proxy) {

        }
        for (let item of obj.items.sort((a, b) => {
            const sortOrder = ["info", "homework"];
            return sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type);
        })) {
            console.log(item);
            newCard({
                subject: obj.subject,
                courseCode: obj.courseCode,
                classId: obj.classID,
                item: item
            });
        }
    }
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