import DOMPurify from 'dompurify';

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // If input already has &lt; or &gt;, assume it’s escaped
  if (input.includes('&lt;') || input.includes('&gt;')) return input;

  return input
    .replace(/&/g, '&amp;')   // must be first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

};

//Make sure that even if someone managed to input a script tag, it won't be executed
export function safeText(input) {

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],    // no tags allowed
    ALLOWED_ATTR: [],    // no attributes
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style'],
    FORBID_ATTR: ['on*', 'style'],
    RETURN_DOM_FRAGMENT: false
  });

}

export const verifyInput = (input, ErrorRef, maxLength) => {
    let inputValue = input.trim();
    if(inputValue.length === 0){
        ErrorRef.current.innerHTML = "Error: Input cannot be empty";
    } else if (inputValue.length > maxLength){
        ErrorRef.current.innerHTML = "Error: Input cannot exceed " + maxLength + " characters";
    } else {
        ErrorRef.current.innerHTML = "";
    }
}