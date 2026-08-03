import axiosInstance from "@/utils/axiosInstance"
import { getFormDataFromObject } from "@/utils/functions"
import axios from "axios"


export const apiRegisterUser = (data: API.UserRegisterForm)=>{
    const formData = getFormDataFromObject(data)
    return axios.post(axiosInstance.defaults.baseURL +'/dj-rest-auth/registration/',formData,{
        headers: {
            'Accept-Language': document.documentElement.lang
        }
    })
}

export const apiLoginUser = (data: { email: string; password: string }) => {
    return axios.post<{user: API.User, access: string, refresh: string}>(
        axiosInstance.defaults.baseURL + '/dj-rest-auth/login/',
        { email: data.email, password: data.password },
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': document.documentElement.lang
            },
            withCredentials: true
        }
    )
}

export const apiResetPassword = (data: { email: string }) => {
    return axios.post(axiosInstance.defaults.baseURL +'/dj-rest-auth/password/reset/', data,{
        headers: {
            'Accept-Language': document.documentElement.lang
        }
    })
}

export const apiResetPasswordConfirm = (data: API.ResetPasswordConfirmForm) => {
    const { uuid, ...rest } = data;
    return axios.post(axiosInstance.defaults.baseURL +'/dj-rest-auth/password/reset/confirm/', { ...rest, uid: uuid },{
        headers: {
            'Accept-Language': document.documentElement.lang
        }
    })
}

export const apiConfirmEmail = (data: { key: string }) => {
    return axios.post(axiosInstance.defaults.baseURL +'/dj-rest-auth/registration/verify-email', data,{
        headers: {
            'Accept-Language': document.documentElement.lang
        }
    })
}

export const apiResendVerificationEmail = (data: { email: string }) => {
    return axios.post(axiosInstance.defaults.baseURL +'/dj-rest-auth/registration/resend-email/', data,{
        headers: {
            'Accept-Language': document.documentElement.lang
        }
    })
}

export const apiLogoutUser = () => {
    return axiosInstance.post('/dj-rest-auth/logout/')
}

export const apiGetMe = () => {
    return axiosInstance.get<API.User>('/dj-rest-auth/user/')
}

export const apiUpdateUser = (data: API.UserUpdateForm) => {
    return axiosInstance.patch('/dj-rest-auth/user/', data)
}

export const apiUpdateUserImage = (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    return axiosInstance.patch('/dj-rest-auth/user/', formData)
}

export const apiUpdateCabinet = (data: API.CabinetUpdateForm) => {
    const formData = getFormDataFromObject(data);
    return axiosInstance.patch<API.CabinetUpdateResponse>('/cabinets/me/', formData);
}

export const apiChangePassword = (data: API.ChangePasswordForm) => {
    return axiosInstance.post('/dj-rest-auth/password/change/', data)
}

export const apiSetupPassword = (data: { token: string; password: string }) => {
    return axios.post(axiosInstance.defaults.baseURL + '/auth/setup-password/', data, {
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': document.documentElement.lang
        },
        withCredentials: true
    })
}