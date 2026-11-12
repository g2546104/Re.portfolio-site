
document.addEventListener("DOMContentLoaded", function () {
    const grid = document.getElementById("works-grid");
    const categorySelect = document.getElementById("category");
    const sortSelect = document.getElementById("sort");

    // CSVを読み込む
    fetch("./works.csv")
        .then(function (response) {
            if (!response.ok) {
                throw new Error("CSVを読み込めませんでした。");
            }

            return response.text();
        })
        .then(function (data) {
            // UTF-8 BOMと改行コードを整理する
            data = data.replace(/^\uFEFF/, "").trim();

            const rows = data.split(/\r?\n/);

            if (rows.length < 2) {
                throw new Error("CSVに作品データがありません。");
            }

            // 1行目は見出し
            const headers = rows[0].split(",").map(function (header) {
                return header.trim();
            });

            // 2行目以降を作品データにする
            const works = rows.slice(1)
                .filter(function (row) {
                    return row.trim() !== "";
                })
                .map(function (row) {
                    const values = row.split(",");
                    const work = {};

                    headers.forEach(function (header, index) {
                        work[header] = (values[index] || "").trim();
                    });

                    return work;
                });

            // カテゴリ一覧を作る
            const categories = [];

            works.forEach(function (work) {
                if (
                    work.category &&
                    !categories.includes(work.category)
                ) {
                    categories.push(work.category);
                }
            });

            categories.sort(function (a, b) {
                return a.localeCompare(b, "ja");
            });

            categories.forEach(function (category) {
                const option = document.createElement("option");
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });

            // 作品を表示する関数
            function displayWorks() {
                const selectedCategory = categorySelect.value;
                const sortType = sortSelect.value;

                // 元データを変更せずにコピーする
                let filteredWorks = works.slice();

                // カテゴリで絞り込む
                if (selectedCategory !== "all") {
                    filteredWorks = filteredWorks.filter(function (work) {
                        return work.category === selectedCategory;
                    });
                }

                // 並び替える
                if (sortType === "new") {
                    filteredWorks.sort(function (a, b) {
                        return Number(b.year) - Number(a.year);
                    });
                } else if (sortType === "old") {
                    filteredWorks.sort(function (a, b) {
                        return Number(a.year) - Number(b.year);
                    });
                } else if (sortType === "title") {
                    filteredWorks.sort(function (a, b) {
                        return a.title.localeCompare(b.title, "ja");
                    });
                }

                // 一覧を空にする
                grid.replaceChildren();

                if (filteredWorks.length === 0) {
                    const message = document.createElement("p");
                    message.textContent = "該当する作品はありません。";
                    grid.appendChild(message);
                    return;
                }

                // 作品カードを作る
                filteredWorks.forEach(function (work) {
                    const card = document.createElement("article");
                    card.className = "work-card";

                    const image = document.createElement("img");
                    image.src = work.image;
                    image.alt = work.title;
                    image.loading = "lazy";

                    // 画像が見つからない場合
                    image.addEventListener("error", function () {
                        image.alt = work.title + "（画像を読み込めません）";
                        image.style.backgroundColor = "#eee";
                    });

                    const info = document.createElement("div");
                    info.className = "work-info";

                    const category = document.createElement("p");
                    category.className = "work-category";
                    category.textContent = work.category;

                    const title = document.createElement("h3");
                    title.textContent = work.title;

                    const description = document.createElement("p");
                    description.className = "description";
                    description.textContent = work.description;

                    const year = document.createElement("p");
                    year.className = "work-year";
                    year.textContent = work.year;

                    info.append(
                        category,
                        title,
                        description,
                        year
                    );

                    card.append(image, info);
                    grid.appendChild(card);
                });
            }

            // 最初の表示
            displayWorks();

            // カテゴリ変更時
            categorySelect.addEventListener("change", displayWorks);

            // 並び替え変更時
            sortSelect.addEventListener("change", displayWorks);
        })
        .catch(function (error) {
            console.error("Worksの読み込みエラー:", error);

            grid.replaceChildren();

            const message = document.createElement("p");
            message.textContent =
                "作品を読み込めませんでした。CSVの場所やファイル名を確認してください。";

            grid.appendChild(message);
        });
});
