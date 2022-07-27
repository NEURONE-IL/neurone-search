/* eslint-disable no-undef */
// script for the neurone search pages useful for loading them in iframes

// features:
// logging the mouse, keyboard and scroll behaviour inside an iframe using postMessage
// rending text snippets highlighted by the user inside the iframe, triggered by a message from the parent

console.log("Neurone iframe utilities script found and loaded.");
// this script will be embedded to the neurone downloaded files
// detect mouse events for the iframe
document.addEventListener('mousemove', () => {postMouseEvent(event, "MouseMove")}, true);
document.addEventListener('click', () => {postMouseEvent(event, "MouseClick")}, true);
document.addEventListener('mouseenter', () => {postMouseEvent(event, "MouseEnter")}, true); // TODO: necessary? this is very trigger happy on divs
// detect the full iframe scroll
document.addEventListener('scroll', postScrollEvent, true);
// detect key presses
document.addEventListener('keydown', () => {postKeyboardEvent(event, "Iframe Key Down")}, true);
document.addEventListener('keyup', () => {postKeyboardEvent(event, "Iframe Key Up")}, true);

// recieve messages from another window
window.onmessage = function(e) {
  // neurone serp message to request the selected text from the iframe/window
  if (e.data.message == 'get_snippet') {
    const selectedText = window.getSelection().toString();
    window.parent.postMessage({message: "Sent text selection from neurone-search page", type: "textSelection", selection: selectedText}, "*");
  }

};

function postMouseEvent(evt, type) {

  // get the useful mouse and window data for the logger
  const mouseData = {
    type: type,
    url: window.document.URL,
    clientX : evt.clientX,
    clientY : evt.clientY,
    pageX : evt.pageX,
    pageY : evt.pageY
  }

  const windowData = {
    url: window.document.URL,
    w_win : window.innerWidth,
    h_win : window.innerHeight,
    w_doc:  document.documentElement.scrollWidth,
    h_doc : document.documentElement.scrollHeight
  }

  window.parent.postMessage({ objType: "neurone_mouse", mouseData: mouseData, windowData: windowData }, "*");
}

function postScrollEvent(evt) {

  const scrollData = {
    type  : "Neurone Iframe Scroll",
    url   : window.document.URL,
    x_scr : window.scrollX,
    y_scr : window.scrollY,
    w_win : window.innerWidth,
    h_win : window.innerHeight,
    w_doc : document.documentElement.scrollWidth,
    h_doc : document.documentElement.scrollHeight
  }

  window.parent.postMessage({ objType: "neurone_scroll", scrollData: scrollData }, "*");
}

function postKeyboardEvent(evt, type) {

  const keyboardData = {
    type      : type,
    target    : evt.target.id,
    which     : evt.which,
    keyCode   : evt.keyCode,
    charCode  : evt.charCode,
    key       : evt.key,
    code      : evt.code,
  }

  const windowData = {
    url: window.document.URL,
    w_win : window.innerWidth,
    h_win : window.innerHeight,
    w_doc:  document.documentElement.scrollWidth,
    h_doc : document.documentElement.scrollHeight
  }

  window.parent.postMessage({ objType: "neurone_keyboard", keyboardData: keyboardData, windowData: windowData }, "*" );
}