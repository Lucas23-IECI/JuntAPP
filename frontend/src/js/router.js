/* ==========================================================================
   JuntAPP History Router
   Maneja el enrutamiento local con History API (URLs limpias, sin #).
   ========================================================================== */

export class Router {
  constructor(routes = {}) {
    this.routes = routes;
    this.init();
  }

  init() {
    // Escucha navegación con botones atrás/adelante
    window.addEventListener("popstate", () => this.handleRouting());

    // Intercepta clicks en links de navegación para evitar recarga
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;

      const href = link.getAttribute("href");

      // Solo interceptar links internos (que empiezan con / y no son externos)
      if (href && href.startsWith("/") && !href.startsWith("//")) {
        e.preventDefault();
        this.navigate(href.substring(1) || "home");
      }
      // También interceptar legacy links con # por si queda alguno
      if (href && href.startsWith("#") && href.length > 1) {
        e.preventDefault();
        this.navigate(href.substring(1));
      }
    });

    // Configura clics en elementos de barra lateral del dashboard
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => {
        const viewName = item.getAttribute("data-view");
        this.navigate(viewName);
      });
    });
  }

  // Navegar actualizando la URL con History API
  navigate(viewName) {
    const path = viewName === "home" ? "/" : `/${viewName}`;
    if (window.location.pathname !== path) {
      window.history.pushState({ view: viewName }, "", path);
    }
    this.handleRouting();
  }

  handleRouting() {
    // Obtener la vista desde el pathname (sin la barra inicial)
    let viewName = window.location.pathname.substring(1);
    const isLoggedOut = document.body.classList.contains("logged-out");

    const publicRoutes = ["home", "caracteristicas", "pricing", "faq", "sobre-nosotros", "contacto", "legal"];
    const privateRoutes = ["inicio", "socios", "tesoreria", "votaciones", "comunicaciones"];

    // Si no hay ruta o es raíz, determinar por defecto según el estado de sesión
    if (!viewName || viewName === "") {
      viewName = isLoggedOut ? "home" : "inicio";
      const path = viewName === "home" ? "/" : `/${viewName}`;
      window.history.replaceState({ view: viewName }, "", path);
    }

    // Guardias de seguridad para ruteo
    if (isLoggedOut) {
      if (!publicRoutes.includes(viewName)) {
        window.history.replaceState({ view: "home" }, "", "/");
        viewName = "home";
      }
    } else {
      if (!privateRoutes.includes(viewName)) {
        window.history.replaceState({ view: "inicio" }, "", "/inicio");
        viewName = "inicio";
      }
    }

    // Comportamiento de vistas según estado
    if (!isLoggedOut) {
      // Actualiza barra de navegación activa en el dashboard privado
      document.querySelectorAll(".nav-item").forEach(item => {
        if (item.getAttribute("data-view") === viewName) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

      // Muestra y oculta contenedores app-view en el DOM
      document.querySelectorAll(".app-view").forEach(v => {
        if (v.id === `view-${viewName}`) {
          v.classList.add("active");
        } else {
          v.classList.remove("active");
        }
      });
    } else {
      // Si estamos deslogueados, manejar las sub-vistas corporativas
      document.querySelectorAll(".corporate-view").forEach(v => {
        if (v.id === `corp-${viewName}`) {
          v.classList.add("active");
        } else {
          v.classList.remove("active");
        }
      });

      // Actualizar clase active en enlaces superiores corporativos (desktop & mobile)
      document.querySelectorAll(".landing-nav-link, .mobile-nav-link").forEach(link => {
        const href = link.getAttribute("href");
        const matchPath = viewName === "home" ? "/" : `/${viewName}`;
        if (href === matchPath) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });
    }

    // Scroll to top when navigating
    window.scrollTo(0, 0);
    const mainContent = document.getElementById("mainContent");
    if (mainContent) {
      mainContent.scrollTop = 0;
    }


    // Gatilla el callback registrado para esta vista
    if (typeof this.routes[viewName] === "function") {
      this.routes[viewName]();
    }
  }

  // Carga inicial
  start() {
    this.handleRouting();
  }
}
