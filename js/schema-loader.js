const schemas = {
  "index.html": [
    "schema-organization.json",
    "schema-localbusiness.json",
    "schema-almazuela.json",
    "schema-goddess.json"
  ],
  "games.html": [
    "schema-organization.json",
    "schema-games.json",
    "schema-almazuela.json",
    "schema-goddess.json"
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
    "soon.html": [
    "schema-organization.json",
    "schema-soon.json"
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

const getText = u => fetch(u).then(r => r.ok ? r.text() : Promise.reject());

const inject = t => {
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.text = t;
  document.head.appendChild(s);
};

const TRANSLATED = new Set([
  "schema-localbusiness.json",
  "schema-games.json",
  "schema-almazuela.json",
  "schema-philosophy.json",
  "schema-contact.json",
  "schema-support.json",
  "schema-goddess.json",
  "schema-soon.json"
]);

if (schemas[page]) {
  const ready = window.i18n ? i18n.ready : Promise.resolve();
  ready.then(() => {
    const l = window.i18n ? i18n.lang : "es";
    schemas[page].forEach(file => {
      const url = `/json/${l}/${file}`;
      getText(url)
        .then(inject)
        .catch(err => console.error("Error cargando schema:", file, err));
          });
        });
}
