// Paste your Supabase project information below.
// Sign in to supabase.com, open your project, and copy the API URL + anon key.
const SUPABASE_URL = 'https://seuwchtebapvuylkgcoc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNldXdjaHRlYmFwdnV5bGtnY29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNTg0NTgsImV4cCI6MjA3ODkzNDQ1OH0.uQTHBQgDAqR8NUPt358XdYj53gvY7Qw139bl4Kj9DyE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const state = {
  companies: [],
  contacts: [],
  tasks: [],
  selectedContactId: '',
};

document.addEventListener('DOMContentLoaded', () => {
  if (SUPABASE_URL.includes('YOUR-PROJECT')) {
    console.warn('Update SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials.');
  }

  setupNavigation();
  wireFormHandlers();
  loadCompanies();
  loadContacts();
});

function setupNavigation() {
  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
}

function switchSection(target) {
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === target);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.section === target);
  });
}

function wireFormHandlers() {
  document.getElementById('companyForm').addEventListener('submit', handleCompanySubmit);
  document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);

  document
    .getElementById('companyList')
    .addEventListener('click', handleCompanyListAction);
  document
    .getElementById('contactList')
    .addEventListener('click', handleContactListAction);
  document.getElementById('taskList').addEventListener('click', handleTaskListAction);

  document
    .getElementById('taskContactSelect')
    .addEventListener('change', (event) => {
      const contactId = event.target.value;
      state.selectedContactId = contactId;
      if (contactId) {
        loadTasksForContact(contactId);
      } else {
        state.tasks = [];
        renderTaskList();
      }
    });
}

function showStatus(element, message, type = '') {
  element.textContent = message;
  element.classList.remove('error', 'success');
  if (type) {
    element.classList.add(type);
  }
}

function setButtonLoading(button, isLoading, loadingText = 'Saving...') {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
  button.disabled = isLoading;
}

async function loadCompanies() {
  const statusEl = document.getElementById('companyStatus');
  showStatus(statusEl, 'Loading companies...');
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to load companies', error);
    showStatus(statusEl, 'Could not load companies.', 'error');
    return;
  }

  state.companies = data || [];
  renderCompanyList();
  populateCompanySelect();
  renderContactList();
  populateContactSelect();
  showStatus(statusEl, `${state.companies.length} companies loaded.`, 'success');
}

async function loadContacts() {
  const statusEl = document.getElementById('contactStatus');
  showStatus(statusEl, 'Loading contacts...');
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load contacts', error);
    showStatus(statusEl, 'Could not load contacts.', 'error');
    return;
  }

  state.contacts = data || [];
  renderContactList();
  populateContactSelect();
  showStatus(statusEl, `${state.contacts.length} contacts loaded.`, 'success');
}

async function loadTasksForContact(contactId) {
  if (!contactId) return;
  const statusEl = document.getElementById('taskStatus');
  showStatus(statusEl, 'Loading tasks...');
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('contact_id', contactId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load tasks', error);
    showStatus(statusEl, 'Could not load tasks.', 'error');
    return;
  }

  state.tasks = data || [];
  renderTaskList();
  showStatus(statusEl, `${state.tasks.length} task(s) loaded.`, 'success');
}

function renderCompanyList() {
  const body = document.getElementById('companyList');
  if (state.companies.length === 0) {
    body.innerHTML = '<tr><td colspan="4">No companies yet.</td></tr>';
    return;
  }

  body.innerHTML = state.companies
    .map(
      (company) => `
      <tr>
        <td>${company.name || ''}</td>
        <td>${company.phone || '-'}</td>
        <td>${company.address || '-'}</td>
        <td>
          <button class="inline-btn primary" data-action="viewContacts" data-company-id="${company.id}">
            View Contacts
          </button>
        </td>
      </tr>
    `
    )
    .join('');
}

function renderContactList() {
  const body = document.getElementById('contactList');
  if (state.contacts.length === 0) {
    body.innerHTML = '<tr><td colspan="3">No contacts yet.</td></tr>';
    return;
  }

  body.innerHTML = state.contacts
    .map((contact) => {
      const company = state.companies.find((c) => c.id === contact.company_id);
      const companyName = company ? company.name : 'Unknown company';
      return `
        <tr>
          <td>${contact.first_name || ''} ${contact.last_name || ''}</td>
          <td>${companyName}</td>
          <td>
            <button class="inline-btn primary" data-action="viewTasks" data-contact-id="${contact.id}">
              View Tasks
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderTaskList() {
  const body = document.getElementById('taskList');
  if (!state.selectedContactId) {
    body.innerHTML = '<tr><td colspan="4">Select a contact to view their tasks.</td></tr>';
    return;
  }

  if (state.tasks.length === 0) {
    body.innerHTML =
      '<tr><td colspan="4">This contact has no tasks. Add one above.</td></tr>';
    return;
  }

  body.innerHTML = state.tasks
    .map(
      (task) => `
        <tr>
          <td>${task.title}</td>
          <td>${task.due_date || '-'}</td>
          <td>${task.status}</td>
          <td>
            <button
              class="inline-btn primary"
              data-action="toggleTask"
              data-task-id="${task.id}"
              data-current-status="${task.status}"
            >
              ${task.status === 'done' ? 'Reopen' : 'Mark Done'}
            </button>
          </td>
        </tr>
      `
    )
    .join('');
}

function populateCompanySelect() {
  const select = document.getElementById('contactCompanySelect');
  const options = ['<option value="">Select a company</option>'];
  state.companies.forEach((company) => {
    options.push(`<option value="${company.id}">${company.name}</option>`);
  });
  select.innerHTML = options.join('');
}

function populateContactSelect() {
  const select = document.getElementById('taskContactSelect');
  const options = ['<option value="">Select a contact</option>'];
  state.contacts.forEach((contact) => {
    const company = state.companies.find((c) => c.id === contact.company_id);
    const companyName = company ? company.name : 'Unknown company';
    options.push(
      `<option value="${contact.id}">${contact.first_name} ${contact.last_name} • ${companyName}</option>`
    );
  });
  select.innerHTML = options.join('');

  if (state.selectedContactId) {
    select.value = state.selectedContactId;
  }
}

async function handleCompanySubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById('companyName');
  const phoneInput = document.getElementById('companyPhone');
  const addressInput = document.getElementById('companyAddress');
  const statusEl = document.getElementById('companyStatus');
  const submitButton = event.target.querySelector('button[type="submit"]');

  const name = nameInput.value.trim();
  if (!name) {
    showStatus(statusEl, 'Company name is required.', 'error');
    return;
  }

  const newCompany = {
    name,
    phone: phoneInput.value.trim() || null,
    address: addressInput.value.trim() || null,
  };

  setButtonLoading(submitButton, true);
  const { error } = await supabase.from('companies').insert(newCompany);
  setButtonLoading(submitButton, false);

  if (error) {
    console.error('Failed to add company', error);
    showStatus(statusEl, 'Could not save company.', 'error');
    return;
  }

  event.target.reset();
  showStatus(statusEl, 'Company saved!', 'success');
  loadCompanies();
}

async function handleContactSubmit(event) {
  event.preventDefault();
  const companySelect = document.getElementById('contactCompanySelect');
  const firstNameInput = document.getElementById('contactFirstName');
  const lastNameInput = document.getElementById('contactLastName');
  const emailInput = document.getElementById('contactEmail');
  const phoneInput = document.getElementById('contactPhone');
  const statusEl = document.getElementById('contactStatus');
  const submitButton = event.target.querySelector('button[type="submit"]');

  const companyId = companySelect.value;
  if (!companyId) {
    showStatus(statusEl, 'Select a company for this contact.', 'error');
    return;
  }

 const firstName = firstNameInput.value.trim();
const lastName = lastNameInput.value.trim();
if (!firstName) {
  showStatus(statusEl, 'First name is required.', 'error');
  return;
}


  const newContact = {
    company_id: companyId,
    first_name: firstName,
    last_name: lastName,
    email: emailInput.value.trim() || null,
    phone: phoneInput.value.trim() || null,
  };

  setButtonLoading(submitButton, true);
  const { error } = await supabase.from('contacts').insert(newContact);
  setButtonLoading(submitButton, false);

  if (error) {
    console.error('Failed to add contact', error);
    showStatus(statusEl, 'Could not save contact.', 'error');
    return;
  }

  event.target.reset();
  showStatus(statusEl, 'Contact saved!', 'success');
  loadContacts();
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const contactSelect = document.getElementById('taskContactSelect');
  const titleInput = document.getElementById('taskTitle');
  const dueDateInput = document.getElementById('taskDueDate');
  const statusEl = document.getElementById('taskStatus');
  const submitButton = event.target.querySelector('button[type="submit"]');

  const contactId = contactSelect.value;
  if (!contactId) {
    showStatus(statusEl, 'Select a contact before adding a task.', 'error');
    return;
  }

  const title = titleInput.value.trim();
  if (!title) {
    showStatus(statusEl, 'Task title is required.', 'error');
    return;
  }

  const newTask = {
    contact_id: contactId,
    title,
    due_date: dueDateInput.value || null,
  };

  setButtonLoading(submitButton, true);
  const { error } = await supabase.from('tasks').insert(newTask);
  setButtonLoading(submitButton, false);

  if (error) {
    console.error('Failed to add task', error);
    showStatus(statusEl, 'Could not save task.', 'error');
    return;
  }

  event.target.reset();
  showStatus(statusEl, 'Task saved!', 'success');
  state.selectedContactId = contactId;
  loadTasksForContact(contactId);
}

async function updateTaskStatus(taskId, newStatus) {
  const statusEl = document.getElementById('taskStatus');
  showStatus(statusEl, 'Updating task...');
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId);

  if (error) {
    console.error('Failed to update task', error);
    showStatus(statusEl, 'Could not update task.', 'error');
    return;
  }

  showStatus(statusEl, 'Task updated.', 'success');
  if (state.selectedContactId) {
    loadTasksForContact(state.selectedContactId);
  }
}

function handleCompanyListAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.action === 'viewContacts') {
    switchSection('contacts');
    document.getElementById('contactCompanySelect').value = button.dataset.companyId;
  }
}

function handleContactListAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.action === 'viewTasks') {
    const contactId = button.dataset.contactId;
    state.selectedContactId = contactId;
    document.getElementById('taskContactSelect').value = contactId;
    switchSection('tasks');
    loadTasksForContact(contactId);
  }
}

function handleTaskListAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.action === 'toggleTask') {
    const currentStatus = button.dataset.currentStatus;
    const nextStatus = currentStatus === 'done' ? 'open' : 'done';
    updateTaskStatus(button.dataset.taskId, nextStatus);
  }
}
