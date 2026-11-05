export class Settings {
  constructor() {
    this.sensitivity = parseFloat(localStorage.getItem('wf_sensitivity') || '1.0');
    this.invertY = localStorage.getItem('wf_invertY') === 'true';
    this.fov = parseFloat(localStorage.getItem('wf_fov') || '72');
  }

  save() {
    localStorage.setItem('wf_sensitivity', this.sensitivity);
    localStorage.setItem('wf_invertY', this.invertY);
    localStorage.setItem('wf_fov', this.fov);
  }

  isMobile() {
    return window.matchMedia('(pointer: coarse)').matches;
  }
}