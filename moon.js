document.addEventListener("DOMContentLoaded", function () {
    const moonIcon = document.getElementById("moon-icon");
    const moonName = document.getElementById("moon-name");

    if (!moonIcon || !moonName) return;

    // 2000年1月6日ごろの新月を基準に計算
    const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);

    // 月の満ち欠けの周期：約29.53日
    const lunarCycle = 29.530588853;
    const now = new Date();

    const daysSinceNewMoon =
        (now.getTime() - knownNewMoon) /
        (1000 * 60 * 60 * 24);

    // 月の満ち欠けの割合（0～1）
    const phase =
        ((daysSinceNewMoon % lunarCycle) + lunarCycle) %
        lunarCycle / lunarCycle;

    // 月のアイコンと名前
    const moons = [
        { icon: "🌑", name: "新月" },
        { icon: "🌒", name: "三日月" },
        { icon: "🌓", name: "上弦の月" },
        { icon: "🌔", name: "満ちていく月" },
        { icon: "🌕", name: "満月" },
        { icon: "🌖", name: "欠けていく月" },
        { icon: "🌗", name: "下弦の月" },
        { icon: "🌘", name: "細い月" }
    ];

    const index = Math.round(phase * 8) % 8;
    const moon = moons[index];

    moonIcon.textContent = moon.icon;
    moonName.textContent = moon.name;

    moonIcon.setAttribute("aria-hidden", "true");
    document
        .getElementById("moon-display")
        .setAttribute("aria-label", "今日の月：" + moon.name);
});