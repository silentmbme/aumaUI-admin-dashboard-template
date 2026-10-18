"use strict";

// Bundled scripts have separate scopes; expose the customizer integration.
window.MetraSidenav = Object.freeze({
  toggleSidemenu,
  setNavActive,
  clearNavDropdown,
  checkHoriMenu,
});

const ANIMATION_DURATION = 300;

const sidebar = document.getElementById("sidebar");
let mainContentDiv = document.querySelector(".main-content");

const slideHasSub = document.querySelectorAll(".nav > ul > .sidenav-item.has-submenu");

const firstLevelItems = document.querySelectorAll(
  ".nav > ul > .sidenav-item.has-submenu > a"
);

const innerLevelItems = document.querySelectorAll(
  ".nav > ul > .sidenav-item.has-submenu .sidenav-item.has-submenu > a"
);

// Animation phases share spacing and transition cleanup across every submenu.
const sidebarBehavior = {
  spacing: ['padding-top', 'padding-bottom', 'margin-top', 'margin-bottom'],
  clear(target, properties) {
    properties.forEach(property => target.style.removeProperty(property));
  },
  compress(target) {
    ['paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'].forEach(property => {
      target.style[property] = 0;
    });
  },
  transition(target, duration) {
    target.style.transitionProperty = 'height, margin, padding';
    target.style.transitionDuration = `${duration}ms`;
  },
  toggleInteraction(mode) {
    if (!['menu-click', 'menu-hover', 'icon-click', 'icon-hover'].includes(mode)) return;
    const root = document.documentElement;
    const closedState = mode + '-closed';
    const reopening = root.getAttribute('data-toggled') === closedState;
    if (reopening) root.removeAttribute('data-toggled');
    else root.setAttribute('data-toggled', closedState);
    if (mode.endsWith('-hover')) {
      if (reopening) setNavActive();
      else clearNavDropdown();
    }
  },
};

class PopperObject {
  instance = null;
  reference = null;
  popperTarget = null;

  constructor(reference, popperTarget) {
    this.init(reference, popperTarget);
  }

  init(reference, popperTarget) {
    this.reference = reference;
    this.popperTarget = popperTarget;
    this.instance = Popper.createPopper(this.reference, this.popperTarget, {
      placement: "bottom",
      strategy: "relative",
      resize: true,
      modifiers: [
        {
          name: "computeStyles",
          options: {
            adaptive: false,
          },
        },
      ],
    });

    this.observeGeometry();
    document.addEventListener('click', event => this.clicker(event, this.popperTarget, this.reference), false);
  }

  observeGeometry() {
    const observer = new ResizeObserver(() => this.instance.update());
    [this.popperTarget, this.reference].forEach(element => observer.observe(element));
  }

  clicker(event, popperTarget, reference) {
    if (
      sidebar.classList.contains("collapsed") &&
      !popperTarget.contains(event.target) &&
      !reference.contains(event.target)
    ) {
      this.hide();
    }
  }

  hide() {
  }
}

class Poppers {
  subMenuPoppers = [];

  constructor() {
    this.init();
  }

  init() {
    slideHasSub.forEach((element) => {
      this.subMenuPoppers.push(
        new PopperObject(element, element.lastElementChild)
      );
      this.closePoppers();
    });
  }

  togglePopper(target) {
    if (
      window.getComputedStyle(target).visibility === "hidden" &&
      window.getComputedStyle(target).visibility === undefined
    )
      target.style.visibility = "visible";
    else target.style.visibility = "hidden";
  }

  updatePoppers() {
    this.subMenuPoppers.forEach((element) => {
      element.instance.state.elements.popper.style.display = "none";
      element.instance.update();
    });
  }

  closePoppers() {
    this.subMenuPoppers.forEach((element) => {
      element.hide();
    });
  }
}

const slideUp = (target, duration = ANIMATION_DURATION) => {
  const { parentElement } = target;
  parentElement.classList.remove("open");
  sidebarBehavior.transition(target, duration);
  target.style.boxSizing = "border-box";
  target.style.height = `${target.offsetHeight}px`;
  target.offsetHeight;
  target.style.overflow = "hidden";
  target.style.height = 0;
  sidebarBehavior.compress(target);
  window.setTimeout(() => {
    target.style.display = "none";
    sidebarBehavior.clear(target, ['height', ...sidebarBehavior.spacing, 'overflow', 'transition-duration', 'transition-property']);
  }, duration);

  const listItem = target.closest("li");
  if (listItem) {
    // Find the first sibling <ul> element
    const siblingUL = listItem.querySelector("ul");
    if (siblingUL) {
      siblingUL.classList.remove("force-left");
    }
  }
};
const slideDown = (target, duration = ANIMATION_DURATION) => {
  const { parentElement } = target;
  parentElement.classList.add("open");
  target.style.removeProperty("display");
  let { display } = window.getComputedStyle(target);
  if (display === "none") display = "block";
  target.style.display = display;
  const height = target.offsetHeight;
  target.style.overflow = "hidden";
  target.style.height = 0;
  sidebarBehavior.compress(target);
  target.offsetHeight;
  target.style.boxSizing = "border-box";
  sidebarBehavior.transition(target, duration);
  target.style.height = `${height}px`;
  sidebarBehavior.clear(target, sidebarBehavior.spacing);
  window.setTimeout(() => {
    sidebarBehavior.clear(target, ['height', 'overflow', 'transition-property', 'transition-duration']);
  }, duration);

  let html = document.documentElement;

  const listItem = target.closest("li");
  // Get the position of the clicked element
  const dropdownRect = listItem.getBoundingClientRect();
  const dropdownWidth = target.getBoundingClientRect().width;

  // Calculate the right edge position
  const rightEdge = dropdownRect.right + dropdownWidth;
  const leftEdge = dropdownRect.left - dropdownWidth;

  if (html.getAttribute("dir") == "rtl") {
    if (leftEdge < 0) {
      target.classList.add('force-left');
    } else {
      if (listItem.closest('ul').classList.contains('force-left') && rightEdge < window.innerWidth) {
        target.classList.add('force-left');
      } else {
        // Reset classes and position if not moving out
        target.classList.remove('force-left');
      }
    }
  } else {
    // Check if moving out to the right
    if (rightEdge > window.innerWidth) {
      target.classList.add('force-left');
    } else {
      if (listItem.closest('ul').classList.contains('force-left') && leftEdge > 0) {
        target.classList.add('force-left');
      }
      // Check if moving out to the left
      else if (leftEdge < 0) {
        target.classList.remove('force-left');
      } else {
        // Reset classes and position if not moving out
        target.classList.remove('force-left');
      }
    }
  }
};
const slideToggle = (target, duration = ANIMATION_DURATION) => {
  const root = document.documentElement;
  const mode = root.getAttribute('data-nav-style');
  const hoverClosed = window.innerWidth >= 992 &&
    ['menu-hover', 'icon-hover'].includes(mode) &&
    root.getAttribute('data-toggled') === mode + '-closed';
  if (hoverClosed || !target || target.nodeType == 3) return;
  return window.getComputedStyle(target).display === 'none'
    ? slideDown(target, duration)
    : slideUp(target, duration);
};

const PoppersInstance = new Poppers();

/**
 * wait for the current animation to finish and update poppers position
 */
const updatePoppersTimeout = () => {
  setTimeout(() => {
    PoppersInstance.updatePoppers();
  }, ANIMATION_DURATION);
};

const defaultOpenMenus = document.querySelectorAll(".sidenav-item.has-submenu.open");

defaultOpenMenus.forEach((element) => {
  element.lastElementChild.style.display = "block";
});

/**
 * handle top level submenu click
 */
firstLevelItems.forEach((element) => {
  element.addEventListener("click", () => {
    let html = document.querySelector("html");
    if ((html.getAttribute("data-nav-style") != "menu-hover" && html.getAttribute("data-nav-style") != "icon-hover") || window.innerWidth < 992 || (!html.getAttribute("data-toggled") && html.getAttribute("data-sidebar-layout") != "horizontal")) {
      const parentMenu = element.closest(".nav.sub-open");
      if (parentMenu)
        parentMenu
          .querySelectorAll(":scope > ul > .sidenav-item.has-submenu > a")
          .forEach((el) => {
            if (
              el.nextElementSibling.style.display === "block" ||
              window.getComputedStyle(el.nextElementSibling).display === "block"
            ) {
              slideUp(el.nextElementSibling);
            }
          });
      slideToggle(element.nextElementSibling);
    }
  });
});

/**
 * handle inner submenu click
 */
innerLevelItems.forEach((element) => {
  let html = document.querySelector("html");
  element.addEventListener("click", () => {

    if ((html.getAttribute("data-nav-style") != "menu-hover" && html.getAttribute("data-nav-style") != "icon-hover") || window.innerWidth < 992 || (!html.getAttribute("data-toggled") && html.getAttribute("data-sidebar-layout") != "horizontal")) {
      const innerMenu = element.closest(".sidenav-submenu");
      if (innerMenu)
        innerMenu
          .querySelectorAll(":scope .sidenav-item.has-submenu > a")
          .forEach((el) => {
            if (
              el.nextElementSibling &&
              el.nextElementSibling?.style.display === "block"
            ) {
              slideUp(el.nextElementSibling);
            }
          });
      slideToggle(element.nextElementSibling);
    }
  });
});

/**
 * menu styles
 */
let headerToggleBtn, WindowPreSize;
(() => {
  let html = document.querySelector("html");
  headerToggleBtn = document.querySelector(".topbar-menu-toggle");
  if(headerToggleBtn) headerToggleBtn.addEventListener("click", toggleSidemenu);
  let mainContent = document.querySelector(".main-content");
  if (mainContent) {
    if (window.innerWidth <= 992) {
      mainContent.addEventListener("click", menuClose);
    } else {
      mainContent.removeEventListener("click", menuClose);
    }
  }

  WindowPreSize = [window.innerWidth];
  setNavActive();
  if (
    html.getAttribute("data-sidebar-layout") === "horizontal" &&
    window.innerWidth >= 992
  ) {
    clearNavDropdown();
    mainContent.addEventListener("click", clearNavDropdown);
  } else {
    mainContent?.removeEventListener("click", clearNavDropdown);
  }

  window.addEventListener("resize", ResizeMenu);
  switcherArrowFn();

  if (
    !localStorage.getItem("AumaUIlayout") &&
    !localStorage.getItem("AumaUIverticalstyles") &&
    !document.querySelector(".landing-body") &&
    document.querySelector("html").getAttribute("data-sidebar-layout") !==
    "horizontal"
  ) {
    if (
      !html.getAttribute("data-vertical-style") &&
      !html.getAttribute("data-nav-style")
    ) {
      iconOverayFn();
    }
  }

  function rtlFn() {
    let html = document.querySelector("html");
    html.setAttribute("dir", "rtl");
    document
      .querySelector("#style")
      ?.setAttribute(
        "href",
        "../assets/libs/bootstrap/css/bootstrap.rtl.min.css"
      );
    //RTL
    if (localStorage.getItem("AumaUIrtl")) {
      document.querySelector("#switcher-rtl").checked = true;
    }
  }

  /* RTL Start */
  if (html.getAttribute("dir") === "rtl") {
    rtlFn();
  }
  /* RTL End */


  toggleSidemenu();
  if (html.getAttribute("data-vertical-style") === "detached") {
    html.removeAttribute("data-toggled");
  }

  if (
    (html.getAttribute("data-nav-style") === "menu-hover" ||
      html.getAttribute("data-nav-style") === "icon-hover") &&
    window.innerWidth >= 992
  ) {
    clearNavDropdown();
  }
  if (window.innerWidth < 992) {
    html.setAttribute("data-toggled", "close");
  }
})();

function ResizeMenu() {
  let html = document.querySelector("html");
  let mainContent = document.querySelector(".main-content");

  WindowPreSize.push(window.innerWidth);
  if (WindowPreSize.length > 2) {
    WindowPreSize.shift();
  }
  if (WindowPreSize.length > 1) {
    if (
      WindowPreSize[WindowPreSize.length - 1] < 992 &&
      WindowPreSize[WindowPreSize.length - 2] >= 992
    ) {
      // less than 992;
      mainContent.addEventListener("click", menuClose);
      setNavActive();
      if (html.getAttribute('data-vertical-style') === 'overlay') {
        sidebar.removeEventListener('mouseenter', mouseEntered);
        sidebar.removeEventListener('mouseleave', mouseLeave);
        html.removeAttribute('data-icon-overlay');
        menuClose();
      } else {
        toggleSidemenu();
      }
      mainContent.removeEventListener("click", clearNavDropdown);
    }

    if (
      WindowPreSize[WindowPreSize.length - 1] >= 992 &&
      WindowPreSize[WindowPreSize.length - 2] < 992
    ) {
      // greater than 992
      mainContent.removeEventListener("click", menuClose);
      if (html.getAttribute('data-vertical-style') === 'overlay') {
        html.removeAttribute('data-toggled');
        html.removeAttribute('data-icon-overlay');
      }
      toggleSidemenu();
      if (html.getAttribute("data-sidebar-layout") === "horizontal") {
        clearNavDropdown();
        mainContent.addEventListener("click", clearNavDropdown);
      } else {
        mainContent.removeEventListener("click", clearNavDropdown);
      }
      if (
        document.documentElement.getAttribute("data-layout-style") ==
        "dualmenu"
      ) {
        if (document.querySelector(".double-menu-active")) {
          html.setAttribute("data-toggled", "dual-menu-open");
        } else {
          html.setAttribute("data-toggled", "dual-menu-close");
        }
      } else if (html.getAttribute('data-vertical-style') !== 'overlay') {
        html.removeAttribute("data-toggled");
      }
    }
  }
  checkHoriMenu();
}
function menuClose() {
  let html = document.querySelector("html");
  html.setAttribute("data-toggled", "close");
  document.querySelector("#responsive-overlay").classList.remove("active");
}
function toggleSidemenu() {
  let html = document.querySelector("html");
  let sidemenuType = html.getAttribute("data-sidebar-layout");

  if (window.innerWidth >= 992) {
    if (sidemenuType === "vertical") {
      sidebar.removeEventListener("mouseenter", mouseEntered);
      sidebar.removeEventListener("mouseleave", mouseLeave);
      sidebar.removeEventListener("click", icontextOpen);
      if(mainContentDiv) mainContentDiv.removeEventListener("click", icontextClose);
      let sidemenulink = document.querySelectorAll(
        ".sidenav-list li > .sidenav-link"
      );
      sidemenulink.forEach((ele) =>
        ele.removeEventListener("click", doubleClickFn)
      );

      let verticalStyle = html.getAttribute("data-layout-style") === "dualmenu"
        ? "doublemenu"
        : html.getAttribute("data-vertical-style");
      switch (verticalStyle) {
        // closed
        case "closed":
          html.removeAttribute("data-nav-style");
          if (html.getAttribute("data-toggled") === "close-menu-close") {
            html.removeAttribute("data-toggled");
          } else {
            html.setAttribute("data-toggled", "close-menu-close");
          }
          break;
        // icon-overlay
        case "overlay":
          html.removeAttribute("data-nav-style");
          if (html.getAttribute("data-toggled") === "icon-overlay-close") {
            html.removeAttribute("data-toggled", "icon-overlay-close");
            sidebar.removeEventListener("mouseenter", mouseEntered);
            sidebar.removeEventListener("mouseleave", mouseLeave);
          } else {
            if (window.innerWidth >= 992) {
              if (!localStorage.getItem("AumaUIlayout")) {
                html.setAttribute("data-toggled", "icon-overlay-close");
              }
              sidebar.addEventListener("mouseenter", mouseEntered);
              sidebar.addEventListener("mouseleave", mouseLeave);
            } else {
              sidebar.removeEventListener("mouseenter", mouseEntered);
              sidebar.removeEventListener("mouseleave", mouseLeave);
            }
          }
          break;
        // icon-text
        case "icontext":
          html.removeAttribute("data-nav-style");
          if (html.getAttribute("data-toggled") === "icon-text-close") {
            html.removeAttribute("data-toggled", "icon-text-close");
            sidebar.removeEventListener("click", icontextOpen);
            if(mainContentDiv) mainContentDiv.removeEventListener("click", icontextClose);
          } else {
            html.setAttribute("data-toggled", "icon-text-close");
            if (window.innerWidth >= 992) {
              sidebar.addEventListener("click", icontextOpen);
              if(mainContentDiv) mainContentDiv.addEventListener("click", icontextClose);
            } else {
              sidebar.removeEventListener("click", icontextOpen);
              if(mainContentDiv) mainContentDiv.removeEventListener("click", icontextClose);
            }
          }
          break;
        // doublemenu
        case "doublemenu":
          html.removeAttribute("data-nav-style");
          if (html.getAttribute("data-toggled") === "dual-menu-open") {
            html.setAttribute("data-toggled", "dual-menu-close");
            if (document.querySelector(".sidenav-submenu")) {
              let slidemenu = document.querySelectorAll(".sidenav-submenu");
              slidemenu.forEach((e) => {
                if (e.classList.contains("double-menu-active")) {
                  e.classList.remove("double-menu-active");
                }
              });
            }
          } else {
            // Select the active top-level category, not a matching link inside
            // its submenu, so the correct second pane opens on page load.
            let sidemenu = document.querySelector(
              ".sidenav-list > li.active > .sidenav-link"
            );
            if (sidemenu) {
              html.setAttribute("data-toggled", "dual-menu-open");
              if (sidemenu.nextElementSibling) {
                sidemenu.nextElementSibling.classList.add("double-menu-active");
              } else {
                document
                  .querySelector("html")
                  .setAttribute("data-toggled", "dual-menu-close");
              }
            }
          }

          doublemenu();
          break;
        // detached
        case "detached":
          if (html.getAttribute("data-toggled") === "detached-close") {
            html.removeAttribute("data-toggled", "detached-close");
            sidebar.removeEventListener("mouseenter", mouseEntered);
            sidebar.removeEventListener("mouseleave", mouseLeave);
          } else {
            html.setAttribute("data-toggled", "detached-close");
            if (window.innerWidth >= 992) {
              sidebar.addEventListener("mouseenter", mouseEntered);
              sidebar.addEventListener("mouseleave", mouseLeave);
            } else {
              sidebar.removeEventListener("mouseenter", mouseEntered);
              sidebar.removeEventListener("mouseleave", mouseLeave);
            }
          }
          break;
        // default
        case "default":
          // Keep an explicitly selected navigation interaction (for example
          // icon-click) instead of replacing it with the overlay layout.
          if (!html.getAttribute("data-nav-style")) {
            iconOverayFn();
            html.removeAttribute("data-toggled");
          }
          break;
      }
      sidebarBehavior.toggleInteraction(html.getAttribute('data-nav-style'));
    }
  } else {
    if (html.getAttribute("data-toggled") === "close") {
      html.setAttribute("data-toggled", "open");
      let i = document.createElement("div");
      i.id = "responsive-overlay";
      setTimeout(() => {
        if (
          document.querySelector("html").getAttribute("data-toggled") == "open"
        ) {
          document.querySelector("#responsive-overlay").classList.add("active");
          document
            .querySelector("#responsive-overlay")
            .addEventListener("click", () => {
              document
                .querySelector("#responsive-overlay")
                .classList.remove("active");
              menuClose();
            });
        }
        window.addEventListener("resize", () => {
          if (window.innerWidth >= 992) {
            document
              .querySelector("#responsive-overlay")
              .classList.remove("active");
          }
        });
      }, 100);
    } else {
      html.setAttribute("data-toggled", "close");
    }
  }
}
// Layout configuration shared by the public customizer entry points.
function applySidebarPreset(preset) {
  const root = document.documentElement;
  root.setAttribute('data-sidebar-layout', 'vertical');
  if (preset === 'dualmenu') {
    root.removeAttribute('data-vertical-style');
    root.setAttribute('data-layout-style', 'dualmenu');
  } else {
    root.removeAttribute('data-layout-style');
    root.setAttribute('data-vertical-style', preset);
    if (preset === 'detached') root.setAttribute('data-header-position', 'fixed');
  }
  root.removeAttribute('data-nav-style');
  toggleSidemenu();
  if (preset === 'overlay') setNavActive();
}

function applyNavigationInteraction(mode) {
  const root = document.documentElement;
  root.setAttribute('data-nav-style', mode);
  const menuMode = mode === 'menu-click' || mode === 'menu-hover';
  if (menuMode) {
    root.removeAttribute('data-hor-style');
    root.removeAttribute('data-vertical-style');
  }
  if (mode === 'menu-hover') {
    document.querySelectorAll('.sidenav-item.has-submenu').forEach(item => {
      item.addEventListener('mouseenter', HoverToggleInnerMenuFn);
      item.addEventListener('mouseleave', HoverToggleInnerMenuRemoveForceFn);
    });
  }
  toggleSidemenu();
  switch (mode) {
    case 'menu-click':
    case 'icon-click':
      if (root.getAttribute('data-sidebar-layout') === 'vertical') setNavActive();
      break;
    case 'menu-hover':
      if (root.getAttribute('data-toggled') === 'menu-hover-closed') clearNavDropdown();
      break;
    case 'icon-hover':
      clearNavDropdown();
      break;
  }
}

// These names remain callable by existing page and customizer scripts.
function mouseEntered() { document.documentElement.setAttribute('data-icon-overlay', 'open'); }
function mouseLeave() { document.documentElement.removeAttribute('data-icon-overlay'); }
function icontextOpen() { document.documentElement.setAttribute('data-icon-text', 'open'); }
function icontextClose() { document.documentElement.removeAttribute('data-icon-text'); }
function closedSidemenuFn() { applySidebarPreset('closed'); }
function detachedFn() { applySidebarPreset('detached'); }
function iconTextFn() { applySidebarPreset('icontext'); }
function iconOverayFn() { applySidebarPreset('overlay'); }
function doubletFn() { applySidebarPreset('dualmenu'); }
function menuClickFn() { applyNavigationInteraction('menu-click'); }
function menuhoverFn() { applyNavigationInteraction('menu-hover'); }
function iconClickFn() { applyNavigationInteraction('icon-click'); }
function iconHoverFn() { applyNavigationInteraction('icon-hover'); }
function setNavActive() {
  let currentPath = window.location.pathname.split("/")[0];

  currentPath =
    location.pathname == "/" ? "index.html" : location.pathname.substring(1);
  currentPath = currentPath.substring(currentPath.lastIndexOf("/") + 1);
  let sidemenuItems = document.querySelectorAll(".sidenav-link");
  sidemenuItems.forEach((e) => {
    if (currentPath === "/") {
      currentPath = "index.html";
    }

    if (e.getAttribute('href') === currentPath) {
      e.classList.add('active');
      e.parentElement.classList.add('active');
      e.parentElement.classList.add('open');
      let parent = e.closest('ul');
      let hasParent = parent;
      if(hasParent.previousElementSibling){
        while (hasParent) {
            hasParent.previousElementSibling.classList.add('active');
            hasParent.previousElementSibling.classList.add('open');
            hasParent.parentElement.classList.add('active');
            hasParent.parentElement.classList.add('open');
            let hasChild =  hasParent.querySelector('li.active')?.querySelector('ul');
            hasChild ? hasChild.style.display = 'block' : null;
            hasParent = hasParent.parentElement.closest('ul');
          }
        }
    }
  });
}
document.querySelector(".sidenav-item.has-submenu.active .sidenav-item.has-submenu.active")?.classList.add("open");
function clearNavDropdown() {
  let sidemenus = document.querySelectorAll("ul.sidenav-submenu");
  sidemenus.forEach((e) => {
    let parent = e.closest("ul");
    let parentNotMain = e.closest("ul:not(.sidenav-list)");
    if (parent) {
      let hasParent = parent.closest("ul.sidenav-list");
      while (hasParent) {
        parent.classList.add("active");
        parent.classList.remove("open");
        slideUp(parent);
        parent = parent.parentElement.closest("ul");
        parentNotMain = parent.closest("ul:not(.sidenav-list)");
        if (!parentNotMain) hasParent = false;
      }
    }
  });
}
function switcherArrowFn() {
  let slideLeft = document.querySelector(".sidenav-scroll-left");
  let slideRight = document.querySelector(".sidenav-scroll-right");

  // used to remove is-expanded class and remove class on clicking arrow buttons
  function slideClick() {
    let slide = document.querySelectorAll(".sidenav-item");
    let slideMenu = document.querySelectorAll(".sidenav-submenu");
    slide.forEach((element, index) => {
      if (element.classList.contains("is-expanded") == true) {
        element.classList.remove("is-expanded");
      }
    });
    slideMenu.forEach((element, index) => {
      if (element.classList.contains("open") == true) {
        element.classList.remove("open");
        element.style.display = "none";
      }
    });
  }

  checkHoriMenu();

  slideLeft.addEventListener("click", () => {
    let menuNav = document.querySelector(".sidenav-list");
    let mainContainer1 = document.querySelector(".sidenav-menu-content");
    let marginLeftValue = Math.ceil(
      Number(window.getComputedStyle(menuNav).marginLeft.split("px")[0])
    );
    let marginRightValue = Math.ceil(
      Number(window.getComputedStyle(menuNav).marginRight.split("px")[0])
    );
    let mainContainer1Width = mainContainer1.offsetWidth;
    if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
      if (!(document.querySelector("html").getAttribute("dir") === "rtl")) {
        if (
          marginLeftValue < 0 &&
          !(Math.abs(marginLeftValue) < mainContainer1Width)
        ) {
          menuNav.style.marginRight = 0;
          menuNav.style.marginLeft =
            Number(menuNav.style.marginLeft.split("px")[0]) +
            Math.abs(mainContainer1Width) +
            "px";
          slideRight.classList.remove("d-none");
        } else if (marginLeftValue >= 0) {
          menuNav.style.marginLeft = "0px";
          slideLeft.classList.add("d-none");
          slideRight.classList.remove("d-none");
        } else {
          menuNav.style.marginLeft = "0px";
          slideLeft.classList.add("d-none");
          slideRight.classList.remove("d-none");
        }
      } else {
        if (
          marginRightValue < 0 &&
          !(Math.abs(marginRightValue) < mainContainer1Width)
        ) {
          menuNav.style.marginLeft = 0;
          menuNav.style.marginRight =
            Number(menuNav.style.marginRight.split("px")[0]) +
            Math.abs(mainContainer1Width) +
            "px";
          slideRight.classList.remove("d-none");
        } else if (marginRightValue >= 0) {
          menuNav.style.marginRight = "0px";
          slideLeft.classList.add("d-none");
          slideRight.classList.remove("d-none");
        } else {
          menuNav.style.marginRight = "0px";
          slideLeft.classList.add("d-none");
          slideRight.classList.remove("d-none");
        }
      }
    } else {
      document.querySelector(".sidenav-list").style.marginLeft = "0px";
      document.querySelector(".sidenav-list").style.marginRight = "0px";
      slideLeft.classList.add("d-none");
    }

    let element = document.querySelector(".sidenav-list > .sidenav-item.open");
    let element1 = document.querySelector(".sidenav-list > .sidenav-item.open >ul");
    if (element) {
      element.classList.remove("open");
    }
    if (element1) {
      element1.style.display = "none";
    }

    slideClick();
    return;
  });
  slideRight.addEventListener("click", () => {
    let menuNav = document.querySelector(".sidenav-list");
    let mainContainer1 = document.querySelector(".sidenav-menu-content");
    let marginLeftValue = Math.ceil(
      Number(window.getComputedStyle(menuNav).marginLeft.split("px")[0])
    );
    let marginRightValue = Math.ceil(
      Number(window.getComputedStyle(menuNav).marginRight.split("px")[0])
    );
    let check = menuNav.scrollWidth - mainContainer1.offsetWidth;
    let mainContainer1Width = mainContainer1.offsetWidth;

    if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
      if (!(document.querySelector("html").getAttribute("dir") === "rtl")) {
        if (Math.abs(check) > Math.abs(marginLeftValue)) {
          menuNav.style.marginRight = 0;
          if (
            !(Math.abs(check) > Math.abs(marginLeftValue) + mainContainer1Width)
          ) {
            mainContainer1Width = Math.abs(check) - Math.abs(marginLeftValue);
            slideRight.classList.add("d-none");
          }
          menuNav.style.marginLeft =
            Number(menuNav.style.marginLeft.split("px")[0]) -
            Math.abs(mainContainer1Width) +
            "px";
          slideLeft.classList.remove("d-none");
        }
      } else {
        if (Math.abs(check) > Math.abs(marginRightValue)) {
          menuNav.style.marginLeft = 0;
          if (
            !(
              Math.abs(check) >
              Math.abs(marginRightValue) + mainContainer1Width
            )
          ) {
            mainContainer1Width = Math.abs(check) - Math.abs(marginRightValue);
            slideRight.classList.add("d-none");
          }
          menuNav.style.marginRight =
            Number(menuNav.style.marginRight.split("px")[0]) -
            Math.abs(mainContainer1Width) +
            "px";
          slideLeft.classList.remove("d-none");
        }
      }
    }

    let element = document.querySelector(".sidenav-list > .sidenav-item.open");
    let element1 = document.querySelector(".sidenav-list > .sidenav-item.open >ul");
    if (element) {
      element.classList.remove("open");
    }
    if (element1) {
      element1.style.display = "none";
    }

    slideClick();
    return;
  });
}
function checkHoriMenu() {
  let menuNav = document.querySelector(".sidenav-list");
  let mainContainer1 = document.querySelector(".sidenav-menu-content");
  let slideLeft = document.querySelector(".sidenav-scroll-left");
  let slideRight = document.querySelector(".sidenav-scroll-right");
  let marginLeftValue = Math.ceil(
    Number(window.getComputedStyle(menuNav).marginLeft.split("px")[0])
  );
  let marginRightValue = Math.ceil(
    Number(window.getComputedStyle(menuNav).marginRight.split("px")[0])
  );
  let check = menuNav.scrollWidth - mainContainer1.offsetWidth;
  // Show/Hide the arrows
  if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
    slideRight.classList.remove("d-none");
    slideLeft.classList.add("d-none");
  } else {
    slideRight.classList.add("d-none");
    slideLeft.classList.add("d-none");
    menuNav.style.marginLeft = "0px";
    menuNav.style.marginRight = "0px";
  }
  if (
    document.querySelector("html").getAttribute("data-sidebar-layout") ===
    "horizontal" &&
    window.innerWidth > 992
  ) {
    let activeMenus = document.querySelectorAll(".sidenav-item.has-submenu.open > ul");
    activeMenus.forEach((e) => {
      let target = e;
      let html = document.documentElement;

      const listItem = target.closest("li");
      // Get the position of the clicked element
      const dropdownRect = listItem.getBoundingClientRect();
      const dropdownWidth = target.getBoundingClientRect().width;

      // Calculate the right edge position
      const rightEdge = dropdownRect.right + dropdownWidth;
      const leftEdge = dropdownRect.left - dropdownWidth;

      if (html.getAttribute("dir") == "rtl") {

        // Check if moving out to the right
        if (e.classList.contains("sidenav-level-1")) {
          if (dropdownRect.left < 0) {
            clearNavDropdown();
          }
        }
        if (leftEdge < 0) {
          target.classList.add('force-left');
        } else {
          if (listItem.closest('ul').classList.contains('force-left') && rightEdge < window.innerWidth) {
            target.classList.add('force-left');
          } else {
            // Reset classes and position if not moving out
            target.classList.remove('force-left');
          }
        }
      } else {
        // Check if moving out to the right
        if (e.classList.contains("sidenav-level-1")) {
          if (dropdownRect.right > window.innerWidth) {
            clearNavDropdown();
          }
        }
        if (rightEdge > window.innerWidth) {
          target.classList.add('force-left');
        } else {
          if (listItem.closest('ul').classList.contains('force-left') && leftEdge > 0) {
            target.classList.add('force-left');
          }
          // Check if moving out to the left
          else if (leftEdge < 0) {
            target.classList.remove('force-left');
          } else {
            // Reset classes and position if not moving out
            target.classList.remove('force-left');
          }
        }
      }
    });
    let leftForceItem = document.querySelector(
      ".sidenav-submenu.active.force-left"
    );
    if (leftForceItem) {
      if (document.querySelector("html").getAttribute("dir") != "rtl") {
        let check =
          leftForceItem.getBoundingClientRect().right;
        if (check < innerWidth) {
          leftForceItem.classList.remove("force-left");
        }
        else if (leftForceItem.getBoundingClientRect().left < 0) {
          if (
            (document.documentElement.getAttribute("data-nav-style") == "menu-hover" ||
              document.documentElement.getAttribute("data-nav-style") == "icon-hover") ||
            window.innerWidth > 992
          ) {
            e.classList.remove("force-left");
          }
        }
      } else {
        let check =
          leftForceItem.getBoundingClientRect().left -
          leftForceItem.parentElement.closest(".sidenav-submenu")?.clientWidth -
          leftForceItem.getBoundingClientRect().width;
        if (check > 0) {
          if (
            (document.documentElement.getAttribute("data-nav-style") == "menu-hover" ||
              document.documentElement.getAttribute("data-nav-style") == "icon-hover") ||
            window.innerWidth > 992
          ) {
            leftForceItem.classList.remove("force-left");
          }
        }
      }
    }

    let elements = document.querySelectorAll(".sidenav-list .has-submenu ul");
    elements.forEach((e) => {
      if (isElementVisible(e)) {
        let ele = e.getBoundingClientRect();
        if (document.documentElement.getAttribute("dir") == "rtl") {
          if (ele.left < 0) {
            if (e.classList.contains("sidenav-level-1")) {
              e.classList.remove("force-left");
            } else {
              e.classList.add("force-left");
            }
          }
        } else {
          if (ele.right > innerWidth) {
            if (e.classList.contains("sidenav-level-1")) {
              e.classList.remove("force-left");
            } else {
              e.classList.add("force-left");
            }
          }
        }
      }
    });
  }
  if (!(document.querySelector("html").getAttribute("dir") === "rtl")) {
    // LTR check the width and adjust the menu in screen
    if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
      if (Math.abs(check) < Math.abs(marginLeftValue)) {
        menuNav.style.marginLeft = -check + "px";
        slideLeft.classList.remove("d-none");
        slideRight.classList.add("d-none");
      }
    }
    if (marginLeftValue == 0) {
      slideLeft.classList.add("d-none");
    } else {
      slideLeft.classList.remove("d-none");
    }
  } else {
    // RTL check the width and adjust the menu in screen
    if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
      if (Math.abs(check) < Math.abs(marginRightValue)) {
        menuNav.style.marginRight = -check + "px";
        slideLeft.classList.remove("d-none");
        slideRight.classList.add("d-none");
      }
    }
    if (marginRightValue == 0) {
      slideLeft.classList.add("d-none");
    } else {
      slideLeft.classList.remove("d-none");
    }
  }
  if (marginLeftValue != 0 || marginRightValue != 0) {
    slideLeft.classList.remove("d-none");
  }
}
function isElementVisible(element) {
  const computedStyle = window.getComputedStyle(element);
  return computedStyle.display != "none";
}
function HoverToggleInnerMenuRemoveForceFn(event) {
  let element = event.currentTarget;
  let target = element.querySelector("ul");
  target.classList.remove("force-left");
}
function HoverToggleInnerMenuFn(event) {
  let html = document.documentElement;
  let element = event.currentTarget;
  let target = element.querySelector("ul");
  if (element && html.getAttribute("data-sidebar-layout") == "horizontal" && (html.getAttribute("data-nav-style") == "menu-hover" || html.getAttribute("data-nav-style") == "icon-hover")) {
    const listItem = element.closest("li");
    // Get the position of the clicked element
    const dropdownRect = listItem.getBoundingClientRect();
    const dropdownWidth = target.getBoundingClientRect().width;

    // Calculate the right edge position
    const rightEdge = dropdownRect.right + dropdownWidth;
    const leftEdge = dropdownRect.left - dropdownWidth;

    if (html.getAttribute("dir") == "rtl") {
      if (leftEdge < 0) {
        target.classList.add('force-left');
      } else {
        if (listItem.closest('ul').classList.contains('force-left') && rightEdge < window.innerWidth) {
          target.classList.add('force-left');
        } else {
          // Reset classes and position if not moving out
          target.classList.remove('force-left');
        }
      }
    } else {
      // Check if moving out to the right
      if (rightEdge > window.innerWidth) {
        target.classList.add('force-left');
      } else {
        if (listItem.closest('ul').classList.contains('force-left') && leftEdge > 0) {
          target.classList.add('force-left');
        }
        // Check if moving out to the left
        else if (leftEdge < 0) {
          target.classList.remove('force-left');
        } else {
          // Reset classes and position if not moving out
          target.classList.remove('force-left');
        }
      }
    }
  }
}

["switcher-horizontal"].map(
  (element) => {
    if (document.getElementById(element)) {
      document.getElementById(element).addEventListener("click", () => {
        let menuNav = document.querySelector(".sidenav-list");
        let mainContainer1 = document.querySelector(".sidenav-menu-content");
        setTimeout(() => {
          if (menuNav.offsetWidth > mainContainer1.offsetWidth) {
            document.getElementById("sidenav-scroll-right").classList.remove("d-none");
          } else {
            document.getElementById("sidenav-scroll-right").classList.add("d-none");
          }
        }, 100);
      });
    }
  }
);

// double-menu click toggle start
function doublemenu() {
  if (window.innerWidth >= 992) {
    let html = document.querySelector("html");
    let sidemenulink = document.querySelectorAll(
      ".sidenav-list > li > .sidenav-link"
    );
    sidemenulink.forEach((ele) => {
      ele.removeEventListener("click", doubleClickFn);
      ele.addEventListener("click", doubleClickFn);
    });
  }
}
function doubleClickFn() {
  const $this = this;
  let html = document.querySelector("html");
  const checkElement = $this.nextElementSibling;
  if (checkElement) {
    if (!checkElement.classList.contains("double-menu-active")) {
      if (document.querySelector(".sidenav-submenu")) {
        let slidemenu = document.querySelectorAll(".sidenav-submenu");
        slidemenu.forEach((e) => {
          if (e.classList.contains("double-menu-active")) {
            e.classList.remove("double-menu-active");
            html.setAttribute("data-toggled", "dual-menu-close");
          }
        });
      }
      checkElement.classList.add("double-menu-active");
      html.setAttribute("data-toggled", "dual-menu-open");
    }
  }
}
// double-menu click toggle end

window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  let mainContent = document.querySelector(".main-content");
  mainContent.removeEventListener("click", clearNavDropdown);
  window.removeEventListener("resize", ResizeMenu);
  let sidemenulink = document.querySelectorAll(
    ".sidenav-list li > .sidenav-link"
  );
  sidemenulink.forEach((ele) =>
    ele.removeEventListener("click", doubleClickFn)
  );
});

// for menu scroll to top active page
let customScrollTop = () => {
  document.querySelectorAll(".sidenav-link").forEach((ele) => {
    if (ele.classList.contains("active")) {
      let elemRect = ele.getBoundingClientRect();
      if (
        ele.children[0] && 
        ele.parentElement.classList.contains("has-submenu") &&
        elemRect.top > 435
      ) {
        ele.scrollIntoView({ behavior: "smooth" });
      }
    } 0
  });
};
setTimeout(() => {
  customScrollTop();
}, 300);
// for menu scroll to top active page

// for menu click active close
document.querySelector(".main-content").addEventListener("click", () => {
  document.querySelectorAll(".sidenav-submenu").forEach((ele) => {
    if (
      document.querySelector("html").getAttribute("data-toggled") ==
      "menu-click-closed" ||
      document.querySelector("html").getAttribute("data-toggled") ==
      "icon-click-closed"
    ) {
      ele.style.display = "none";
    }
  });
});
// for menu click active close
