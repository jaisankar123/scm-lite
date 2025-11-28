// Common script to be used in all protected HTML pages

const token = sessionStorage.getItem("accessToken");

if (!token) {
    window.location.href = "/login"; 
}
