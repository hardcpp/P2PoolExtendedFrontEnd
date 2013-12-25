var contactAddress = "contact@emailaddress.com";

function fixContact() {
  $("#mailto").attr("href", 'mailto:' + contactAddress);
}