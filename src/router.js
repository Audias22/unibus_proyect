import { $, $$ } from "./ui.js";

const routes = new Map();   // path -> render()

export function addRoute(path, render){ routes.set(path, render); }
export function goto(path){ if(location.hash!==path) location.hash = path; else render(); }

export function render(){
  const path = location.hash.replace(/^#/, '') || '/';
  const fn = routes.get(path) || routes.get('/');
  fn?.();
  // actualizar nav activo
  $$('#nav a').forEach(a=>a.classList.toggle('active', a.getAttribute('href')===`#${path}`));
}

export function start(){ window.addEventListener('hashchange', render); render(); }
