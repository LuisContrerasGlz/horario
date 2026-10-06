const form = document.querySelector('#login-form');
const messageEl = document.querySelector('#login-message');
const submitButton = document.querySelector('#login-submit');

function showLoginMessage(message, kind = 'error') {
  messageEl.textContent = message;
  messageEl.dataset.kind = kind;
  messageEl.hidden = false;
}

async function redirectIfAlreadyAuthenticated() {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (response.ok) {
      window.location.replace('/');
    }
  } catch {
    // Sin conexión con el backend; permanece en la pantalla de login.
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  messageEl.hidden = true;
  submitButton.disabled = true;
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(body?.message ?? 'No se pudo iniciar sesión.');
    }
    window.location.replace('/');
  } catch (error) {
    showLoginMessage(error.message, 'error');
  } finally {
    submitButton.disabled = false;
  }
});

redirectIfAlreadyAuthenticated();
