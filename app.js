import {
  OWNER_EMAIL,
  OWNER_USER_ID,
  PROFILE,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "./config.js";

const grid = document.querySelector("#projects-grid");
const dialog = document.querySelector("#admin-dialog");
const adminMessage = document.querySelector("#admin-message");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const projectManager = document.querySelector("#project-manager");
const projectForm = document.querySelector("#project-form");
const managedProjects = document.querySelector("#managed-projects");

let supabase;
let session;
let projects = [];

function safeExternalUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function setMessage(message, isError = false) {
  adminMessage.textContent = message;
  adminMessage.classList.toggle("is-error", isError);
}

function describeProjectLoadError(error) {
  if (error?.code === "PGRST205") {
    return "A tabela public.projects ainda não existe no Supabase. Execute o arquivo supabase/schema.sql no SQL Editor.";
  }
  return error.message;
}

function renderProfile() {
  const name = PROFILE.name.trim() || "Seu Nome";
  document.title = `Portfólio — ${name}`;
  document.querySelector("#brand-initial").textContent = name.charAt(0).toLocaleUpperCase("pt-BR");
  document.querySelector("#footer-initial").textContent = name.charAt(0).toLocaleUpperCase("pt-BR");
  document.querySelector("#brand-name").textContent = name.toLocaleUpperCase("pt-BR");
  document.querySelector("#footer-name").textContent = name.toLocaleUpperCase("pt-BR");
  document.querySelector("#about-name").textContent = name.toLocaleUpperCase("pt-BR");
  document.querySelector("#about-description").textContent = PROFILE.description;
  document.querySelector("#current-year").textContent = new Date().getFullYear();
  loginForm.elements.email.value = OWNER_EMAIL;

  const contactLinks = [
    ["#contact-whatsapp", safeExternalUrl(PROFILE.whatsapp.trim())],
    ["#contact-discord", safeExternalUrl(PROFILE.discord.trim())],
    ["#contact-email", PROFILE.email.trim() ? `mailto:${PROFILE.email.trim()}` : ""],
  ];
  for (const [selector, address] of contactLinks) {
    const link = document.querySelector(selector);
    link.hidden = !address;
    if (address) link.href = address;
  }

  const socials = document.querySelector("#social-links");
  const networks = [
    ["Instagram", PROFILE.instagram],
    ["TikTok", PROFILE.tiktok],
  ];
  for (const [name, address] of networks) {
    const url = safeExternalUrl(address.trim());
    if (!url) continue;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = name;
    socials.append(link);
  }
}

function createProjectCard(project) {
  const article = document.createElement("article");
  article.className = "project-card";

  const visual = document.createElement("div");
  visual.className = "project-visual";
  const imageUrl = safeExternalUrl(project.image_url);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `Imagem de ${project.title}`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
      image.remove();
      visual.classList.add("project-visual-fallback");
    });
    visual.append(image);
  } else {
    visual.classList.add("project-visual-fallback");
    const monogram = document.createElement("span");
    monogram.className = "project-monogram";
    monogram.textContent = project.title.trim().charAt(0).toLocaleUpperCase("pt-BR");
    visual.append(monogram);
  }

  const index = document.createElement("span");
  index.className = "project-index";
  index.textContent = project.featured ? "EM DESTAQUE" : "PROJETO";
  visual.append(index);

  const details = document.createElement("div");
  details.className = "project-details";
  const category = document.createElement("p");
  category.className = "project-category";
  category.textContent = [project.category, project.year].filter(Boolean).join(" · ");
  const title = document.createElement("h3");
  title.textContent = project.title;
  const description = document.createElement("p");
  description.className = "project-description";
  description.textContent = project.description;
  details.append(category, title, description);

  const projectUrl = safeExternalUrl(project.project_url);
  if (projectUrl) {
    const link = document.createElement("a");
    link.className = "project-link";
    link.href = projectUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Ver projeto: ${project.title}`);
    link.textContent = "↗";
    details.append(link);
  }

  article.append(visual, details);
  return article;
}

function renderProjects() {
  grid.replaceChildren();
  if (projects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-projects";
    const title = document.createElement("h3");
    title.textContent = "Ainda sem projetos publicados.";
    const copy = document.createElement("p");
    copy.textContent = "Esta área será atualizada quando eu publicar novos trabalhos.";
    empty.append(title, copy);
    grid.append(empty);
    return;
  }

  for (const project of projects) grid.append(createProjectCard(project));
}

function renderManagedProjects() {
  managedProjects.replaceChildren();
  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "manager-empty";
    empty.textContent = "Você ainda não publicou nenhum projeto.";
    managedProjects.append(empty);
    return;
  }

  for (const project of projects) {
    const row = document.createElement("div");
    row.className = "managed-project";
    const title = document.createElement("span");
    title.textContent = project.title;
    const actions = document.createElement("div");
    actions.className = "managed-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => startEditing(project));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => deleteProject(project));
    actions.append(editButton, deleteButton);
    row.append(title, actions);
    managedProjects.append(row);
  }
}

function updateViews() {
  renderProjects();
  if (session?.user.id === OWNER_USER_ID) renderManagedProjects();
}

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && OWNER_USER_ID);
}

async function loadProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, category, description, year, image_url, project_url, featured, sort_order")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  projects = data;
  updateViews();
}

function setLoggedIn(isLoggedIn) {
  loginForm.hidden = isLoggedIn;
  projectManager.hidden = !isLoggedIn;
  if (!isLoggedIn) resetProjectForm();
}

function startEditing(project) {
  document.querySelector("#project-id").value = project.id;
  document.querySelector("#project-title").value = project.title;
  document.querySelector("#project-category").value = project.category;
  document.querySelector("#project-description").value = project.description;
  document.querySelector("#project-year").value = project.year ?? "";
  document.querySelector("#project-image").value = project.image_url ?? "";
  document.querySelector("#project-url").value = project.project_url ?? "";
  document.querySelector("#project-featured").checked = project.featured;
  document.querySelector("#project-form-title").textContent = "Editar projeto";
  document.querySelector("#save-project").textContent = "Salvar alterações";
  document.querySelector("#cancel-edit").hidden = false;
  projectForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetProjectForm() {
  projectForm.reset();
  projectForm.elements.id.value = "";
  document.querySelector("#project-form-title").textContent = "Adicionar projeto";
  document.querySelector("#save-project").textContent = "Publicar projeto";
  document.querySelector("#cancel-edit").hidden = true;
}

async function deleteProject(project) {
  if (!window.confirm(`Excluir "${project.title}"? Esta ação não pode ser desfeita.`)) return;
  try {
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) throw error;
  } catch (error) {
    setMessage(`Não foi possível excluir o projeto: ${error.message}`, true);
    return;
  }
  setMessage("Projeto excluído.");
  try {
    await loadProjects();
  } catch (error) {
    setMessage(`Projeto excluído, mas a lista não foi atualizada: ${describeProjectLoadError(error)}`, true);
  }
}

document.querySelector("#admin-trigger").addEventListener("click", () => {
  dialog.showModal();
  if (!isConfigured()) {
    setMessage("O painel privado ainda precisa ser conectado ao Supabase. Consulte o README.md.", true);
  } else {
    setMessage("");
  }
});

document.querySelector("#close-admin").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelector("#cancel-edit").addEventListener("click", resetProjectForm);

document.querySelector("#show-signup").addEventListener("click", () => {
  loginForm.hidden = true;
  signupForm.hidden = false;
  setMessage("");
});

document.querySelector("#show-login").addEventListener("click", () => {
  signupForm.hidden = true;
  loginForm.hidden = false;
  setMessage("");
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConfigured()) {
    setMessage("A criação de contas ainda não está conectada ao Supabase. Consulte o README.md.", true);
    return;
  }
  const email = signupForm.elements.email.value.trim();
  const password = signupForm.elements.password.value;
  if (email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    setMessage("Use a conta proprietária apenas para entrar; não crie uma nova conta com esse e-mail.", true);
    return;
  }
  if (password.length < 12) {
    setMessage("Escolha uma senha com pelo menos 12 caracteres.", true);
    return;
  }
  if (password !== signupForm.elements["password-confirm"].value) {
    setMessage("As senhas não conferem.", true);
    return;
  }

  const submitButton = signupForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setMessage("");
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    signupForm.reset();
    setMessage("Cadastro enviado. Confira seu e-mail para confirmar a conta, se a confirmação estiver habilitada.");
  } catch (error) {
    setMessage(`Não foi possível criar a conta: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = loginForm.elements.email.value.trim();
  if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    setMessage("Este e-mail não está autorizado a acessar o painel.", true);
    return;
  }
  if (!isConfigured()) {
    setMessage("O painel ainda não foi conectado ao Supabase. Consulte o README.md.", true);
    return;
  }
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setMessage("");
  let data;
  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password: loginForm.elements.password.value,
    });
    if (result.error) throw result.error;
    data = result.data;
    if (data.user.id !== OWNER_USER_ID) {
      await supabase.auth.signOut();
      setMessage("Esta conta não tem permissão para gerenciar o portfólio.", true);
      return;
    }
    session = data.session;
    setLoggedIn(true);
  } catch (error) {
    setMessage(`Não foi possível entrar: ${error.message}`, true);
    return;
  } finally {
    submitButton.disabled = false;
  }
  setMessage("Sessão iniciada com segurança.");
  try {
    await loadProjects();
  } catch (error) {
    setMessage(`Sessão iniciada, mas os projetos não puderam ser carregados: ${describeProjectLoadError(error)}`, true);
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (session?.user.id !== OWNER_USER_ID) {
    setMessage("Entre na conta proprietária antes de salvar projetos.", true);
    return;
  }
  const form = (name) => document.querySelector(`#project-${name}`);
  const payload = {
    title: form("title").value.trim(),
    category: form("category").value.trim(),
    description: form("description").value.trim(),
    year: form("year").value.trim() || null,
    image_url: form("image").value.trim() || null,
    project_url: form("url").value.trim() || null,
    featured: form("featured").checked,
  };
  for (const key of ["image_url", "project_url"]) {
    if (payload[key] && !safeExternalUrl(payload[key])) {
      setMessage("Use links iniciados por https:// ou http://.", true);
      return;
    }
  }
  const projectId = form("id").value;
  try {
    const result = projectId
      ? await supabase.from("projects").update(payload).eq("id", projectId)
      : await supabase.from("projects").insert(payload);
    if (result.error) throw result.error;
  } catch (error) {
    setMessage(`Não foi possível salvar o projeto: ${error.message}`, true);
    return;
  }
  resetProjectForm();
  setMessage(projectId ? "Projeto atualizado." : "Projeto publicado.");
  try {
    await loadProjects();
  } catch (error) {
    setMessage(`Projeto salvo, mas a lista não foi atualizada: ${describeProjectLoadError(error)}`, true);
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    session = null;
    setLoggedIn(false);
    setMessage("Você saiu da sua conta.");
  } catch (error) {
    setMessage(`Não foi possível encerrar a sessão: ${error.message}`, true);
  }
});

renderProfile();
renderProjects();
setLoggedIn(false);

if (isConfigured()) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    session = data.session;
    if (session?.user.id === OWNER_USER_ID) setLoggedIn(true);
    if (session && session.user.id !== OWNER_USER_ID) {
      await supabase.auth.signOut();
      session = null;
    }
    await loadProjects();
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession;
      setLoggedIn(session?.user.id === OWNER_USER_ID);
    });
  } catch (error) {
    console.error("Não foi possível carregar o portfólio.", error);
    grid.replaceChildren();
    const failure = document.createElement("p");
    failure.className = "load-error";
    failure.textContent = `Não foi possível carregar os projetos: ${describeProjectLoadError(error)}`;
    grid.append(failure);
  }
}
