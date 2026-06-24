const schemas = {
  "index.html": [
    "schema-organization.json",
    "schema-localbusiness.json"
  ],
  "games.html": [
    "schema-organization.json",
    "schema-games.json",
    "schema-almazuela.json"
  ],
  "philosophy.html": [
    "schema-organization.json",
    "schema-philosophy.json"
  ],
  "team.html": [
    "schema-organization.json",
    "schema-team.json"
  ],
  "contact.html": [
    "schema-organization.json",
    "schema-contact.json"
  ],
  "support.html": [
    "schema-organization.json",
    "schema-support.json"
  ]
};

let page = window.location.pathname.split("/").pop();

if (page === "" || page === "pages") {
  page = "index.html";
}

if (window.location.pathname.includes("/pages/")) {
  page = window.location.pathname.split("/pages/")[1];
}

if (schemas[page]) {
  schemas[page].forEach(file => {
    fetch(`/json/${file}`)
      .then(r => r.text())
      .then(t => {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.text = t;
        document.head.appendChild(s);
      })
      .catch(err => console.error("Error cargando schema:", file, err));
  });
}
