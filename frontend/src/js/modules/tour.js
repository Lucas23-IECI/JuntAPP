/* ==========================================================================
   JuntAPP Walkthrough Tour Module
   Maneja las guías interactivas para cada sección del panel usando driver.js.
   ========================================================================== */

import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const tourModule = {
  activeDriver: null,

  init() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".tour-help-btn");
      if (btn) {
        this.startTour();
      }
    });
  },

  getCurrentView() {
    // Obtener vista activa desde el pathname
    let viewName = window.location.pathname.substring(1) || "inicio";
    
    // Fallback: verificar cuál botón nav-item tiene la clase active
    const activeNav = document.querySelector(".nav-item.active");
    if (activeNav) {
      viewName = activeNav.getAttribute("data-view") || viewName;
    }
    return viewName;
  },

  getStepsForView(viewName) {
    const defaultSteps = [
      {
        element: ".app-sidebar",
        popover: {
          title: "Menú de Navegación",
          description: "Navega entre las diferentes secciones del panel para administrar socios, finanzas, votaciones y comunicados oficiales.",
          side: "right",
          align: "start"
        }
      }
    ];

    switch (viewName) {
      case "inicio":
        return [
          {
            element: "#view-inicio .view-header",
            popover: {
              title: "Panel de Inicio",
              description: "Te damos la bienvenida al panel principal. Aquí verás un resumen rápido del estado de tu villa en tiempo real.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#view-inicio .alert-banner",
            popover: {
              title: "Avisos Importantes",
              description: "Revisa aquí los avisos de contingencia comunitarios urgentes publicados por la directiva.",
              side: "bottom",
              align: "center"
            }
          },
          {
            element: "#view-inicio .stats-grid",
            popover: {
              title: "Métricas Vecinales (Post-its)",
              description: "Monitorea la caja chica disponible, socios al día, votaciones en curso y fecha de la próxima asamblea ordinaria.",
              side: "top",
              align: "center"
            }
          }
        ];
      case "socios":
        return [
          {
            element: "#view-socios .view-header",
            popover: {
              title: "Padrón de Vecinos",
              description: "Registro oficial de los socios de la Junta de Vecinos. Puedes gestionar información personal y verificar estados de cuenta.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#view-socios .search-input-wrapper",
            popover: {
              title: "Búsqueda y Filtros",
              description: "Encuentra vecinos rápidamente buscando por su nombre, dirección o RUT. También puedes filtrar según el estado de su pago mensual.",
              side: "bottom",
              align: "center"
            }
          },
          {
            element: "#view-socios #sociosRosterContainer",
            popover: {
              title: "Fichas de Residentes",
              description: "Visualiza RUT, contacto, dirección y estado de pago de cada miembro de la comunidad.",
              side: "top",
              align: "center"
            }
          }
        ];
      case "tesoreria":
        return [
          {
            element: "#view-tesoreria .view-header",
            popover: {
              title: "Libro de Cuentas Transparente",
              description: "Control financiero público y abierto para todos los vecinos. Todo flujo de dinero queda respaldado transparentemente.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#view-tesoreria .t-stats-grid",
            popover: {
              title: "Resumen de Caja chica",
              description: "Visualiza de forma rápida la caja disponible, total acumulado de ingresos y egresos registrados durante el periodo.",
              side: "bottom",
              align: "center"
            }
          },
          {
            element: "#view-tesoreria .ledger-widget",
            popover: {
              title: "Libro de Caja Diario",
              description: "Historial de transacciones financieras. Cada movimiento detalla el monto, responsable y su respectivo comprobante digital.",
              side: "top",
              align: "center"
            }
          }
        ];
      case "votaciones":
        return [
          {
            element: "#view-votaciones .view-header",
            popover: {
              title: "Votaciones Digitales",
              description: "Toma de decisiones colectivas digital y democrática. Participa de manera segura y encriptada desde tu pantalla.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#view-votaciones .active-poll-card",
            popover: {
              title: "Consulta en Curso",
              description: "Emite tu voto en las consultas ciudadanas abiertas. Tu identidad y voto se resguardan confidencialmente bajo la Ley N°19.418.",
              side: "bottom",
              align: "center"
            }
          },
          {
            element: "#view-votaciones .past-polls-widget",
            popover: {
              title: "Historial de Votaciones",
              description: "Consulta las decisiones pasadas aprobadas por los vecinos y visualiza el quórum electoral final.",
              side: "top",
              align: "center"
            }
          }
        ];
      case "comunicaciones":
        return [
          {
            element: "#view-comunicaciones .view-header",
            popover: {
              title: "Tablón de Anuncios Oficiales",
              description: "El mural de comunicados de la Junta de Vecinos. Mantente al día con cortes de agua programados, asambleas ordinarias y talleres vecinales.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#view-comunicaciones #announcementsRosterContainer",
            popover: {
              title: "Noticias Publicadas",
              description: "Revisa todas las publicaciones oficiales categorizadas ordenadamente (Urgente, Asamblea, Beneficio, General).",
              side: "top",
              align: "center"
            }
          }
        ];
      default:
        return defaultSteps;
    }
  },

  startTour() {
    if (this.activeDriver) {
      this.activeDriver.destroy();
    }

    const viewName = this.getCurrentView();
    const rawSteps = this.getStepsForView(viewName);
    
    // Dar formato neo-brutalista a los popovers del tour
    const processedSteps = rawSteps.map(step => {
      if (step.popover) {
        return {
          ...step,
          popover: {
            ...step.popover,
            title: step.popover.title
          }
        };
      }
      return step;
    });

    const driverObj = driver({
      showProgress: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Atrás",
      doneBtnText: "Finalizar",
      progressText: "Paso {{current}} de {{total}}",
      popoverClass: "neo-brutalism-driver",
      stagePadding: 8,
      stageRadius: 0,
      animate: true,
      overlayColor: "#031636",
      overlayOpacity: 0.6,
      steps: processedSteps,
      onDestroyStarted: () => {
        driverObj.destroy();
        this.activeDriver = null;
      }
    });

    this.activeDriver = driverObj;
    driverObj.drive();
  }
};
