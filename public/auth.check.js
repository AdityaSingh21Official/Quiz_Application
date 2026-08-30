(async function () {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
    return;
  }

  const response = await fetch("/api/postLogin/authorize", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    localStorage.removeItem("token");
    window.location.href = "/";
    return;
  }

  const data = await response.json();

  console.log(data.message);
})();
