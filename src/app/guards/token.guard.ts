import { Injectable } from '@angular/core';
import { CanLoad } from '@angular/router';
import { Router } from '@angular/router';
import { LoginService } from '../services/login.service';
import { PublicService } from '../modules/public/public.service';

@Injectable()
export class TokenGuard implements CanLoad {

	constructor(
		public loginService: LoginService,
		private publicService: PublicService,
		public router: Router
	) { }

	canLoad(): Promise<boolean> | boolean {
		const token = this.loginService.token;
		if (!token) {
			this.loginService.logout();
			this.router.navigate(['/home']);
			return false;
		}

		// payload: {usuario: {…}, iat: 1597269832, exp: 1599861832}
		const payload = JSON.parse(atob(token.split('.')[1]));

		// verifica si el token expiro
		const expira = this.expira(payload.exp); // 1599861832
		if (expira) {
			this.publicService.snack('La sesión expiró. Inicie sesión nuevamente.', 5000);
			this.loginService.logout();
			this.router.navigate(['/home']);
			return false;
		}

		// el token no expiro, pero vierifica si esta próximo a vencer para renovar.
		return this.verificaRenueva(payload.exp);
	}

	verificaRenueva(fechaExp: number): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const tokenExp = new Date(fechaExp * 1000);
			const renueva = new Date();
			const ahora = new Date();
			// token expira en 2 horas y debe renovar 10 min antes de expirar
			renueva.setTime(ahora.getTime() + (1 * 10 * 60 * 1000)); // 10 min
			if (tokenExp.getTime() > renueva.getTime()) {
				// no es necesario renovar
				resolve(true);
			} else {
				// debe renovar
				this.loginService.updateToken().subscribe((resp: any) => {
					if (resp.ok) {
						resolve(true);
					} else {
						reject(false);
					}
				}, () => {
					this.loginService.logout();
					reject(false);
				});
			}
		});
	}

	expira(fechaExp: number) {
		const ahora = new Date().getTime() / 1000;
		if (fechaExp < ahora) {
			return true;
		} else {
			return false;
		}
	}
}
