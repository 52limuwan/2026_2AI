let timer = null

export function showToast(message = '提示', duration = 2000) {
  if (!message) return
  let el = document.querySelector('.global-toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'global-toast'
    document.body.appendChild(el)
  }
  el.textContent = message
  el.classList.add('visible')
  clearTimeout(timer)
  timer = setTimeout(() => el.classList.remove('visible'), duration)
}
