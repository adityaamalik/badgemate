function checkPassword(){
    if (document.getElementById('password').value === document.getElementById('confirmPassword').value) {
        document.getElementById('signUpBtn').removeAttribute("disabled");
        document.getElementById('confirmPassword').setAttribute("class","form-control inputs");
  } else {
    document.getElementById('confirmPassword').setAttribute("class","form-control inputs is-invalid");
  }
}