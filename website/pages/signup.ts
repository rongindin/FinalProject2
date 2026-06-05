import { send } from "clientUtilities";

const usernameInput = document.querySelector<HTMLInputElement>("#usernameInput")!;
const passwordInput = document.querySelector<HTMLInputElement>("#passwordInput")!;
const confirmInput = document.querySelector<HTMLInputElement>("#confirmInput")!;
const submitButton = document.querySelector<HTMLButtonElement>("#submitButton")!;
const errorDiv = document.querySelector<HTMLDivElement>("#errorDiv")!;
const toggleButton = document.querySelector<HTMLButtonElement>("#togglePassword")!;

submitButton.onclick = async function () {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;

  if (username == "") {
    errorDiv.innerText = "Please enter a username.";
    return;
  }

  if (password == "") {
    errorDiv.innerText = "Please enter a password.";
    return;
  }

  if (password != confirmPassword) {
    errorDiv.innerText = "Passwords do not match.";
    return;
  }

  const token = await send<string | null>("signUp", username, password);
 
  if (token == null) {
    errorDiv.innerText = "Username already exists.";
    return;
  }

  localStorage.setItem("userToken", token);

  location.href = "index.html";
};

if (toggleButton && passwordInput) {
  toggleButton.addEventListener("click", function (this:HTMLButtonElement) {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";

    this.textContent = isPassword ? "👁" : "⦸";
  })
}