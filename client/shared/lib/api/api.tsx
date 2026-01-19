
import axios, { InternalAxiosRequestConfig } from 'axios';

const baseURL = '/api';

const $host = axios.create({
    baseURL: baseURL
});

const $authHost = axios.create({
    baseURL: baseURL,
    withCredentials: true,
});

const authInterceptor = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (config.headers) {
        config.headers['authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
    }
    return config;
};

$host.interceptors.request.use(request => {
    return request;
});

$authHost.interceptors.response.use(
    response => response, 
    async (error) => {
      const originalRequest = error.config;

      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = false; 
  
        try {
          //await refresh(); 

          return axios(originalRequest);
        } catch (refreshError) {

          console.log(refreshError);
        }
      }
  
    }
  );



$authHost.interceptors.request.use(authInterceptor);

export { $host, $authHost };