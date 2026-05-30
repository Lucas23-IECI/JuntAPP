/* ==========================================================================
   JuntAPP Hash Router
   Maneja el enrutamiento local y la persistencia de pestaña al refrescar.
   ========================================================================== */

export class Router {
  constructor(routes = {}) {
    this.routes = routes;
    this.init();
  }

  init() {
    // Escucha cambios en el hash de la URL
    window.addEventListener("hashchange", () => this.handleRouting());
    
    // Configura clics en elementos de barra lateral
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => {
        const viewName = item.getAttribute("data-view");
        this.navigate(viewName);
      });
    });
  }

  // Navegar actualizando el hash de la URL
  navigate(viewName) {
    window.location.hash = `#${viewName}`;
  }

  // Ejecuta la carga del componente correspondiente
  handleRouting() {
    let hash = window.location.hash.substring(1);
    
    // Ruta por defecto
    if (!hash || !this.routes[hash]) {
      hash = "inicio";
      window.location.hash = "#inicio";
      return;
    }

    // Actualiza barra de navegación activa
    document.querySelectorAll(".nav-item").forEach(item => {
      if (item.getAttribute("data-view") === hash) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Muestra y oculta contenedores en el DOM
    document.querySelectorAll(".app-view").forEach(v => {
      if (v.id === `view-${hash}`) {
        v.classList.add("active");
      } else {
        v.classList.remove("active");
      }
    });

    // Gatilla el callback registrado para esta vista
    if (typeof this.routes[hash] === "function") {
      this.routes[hash]();
    }
  }

  // Carga inicial
  start() {
    this.handleRouting();
  }
}
