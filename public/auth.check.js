(async function () {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "missing.error.html";
    return;
  }

  let response;
  try {
    response = await fetch("/api/postLogin/authorize", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    window.location.href = "server.error.html";
    return;
  }

  if (!response.ok) {
    localStorage.removeItem("token");
    window.location.href = "missing.error.html";
    return;
  }

  const data = await response.json();

  console.log(data.message);
})();
