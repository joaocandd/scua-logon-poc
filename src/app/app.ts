import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoClockBanner } from './core/demo-clock/demo-clock-banner';

@Component({
  imports: [DemoClockBanner, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
