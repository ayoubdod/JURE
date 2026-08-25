import { AxiosError } from "axios"

export const getRemoteFieldsValidation = <T>(error: AxiosError): Record<keyof T, string | undefined> => {
    if(error.response?.status === 400) {
        return Object.keys(error.response?.data as object).reduce((acc, key) => {
            const raw = (error.response?.data as Record<string, unknown>)[key]
            const first = Array.isArray(raw) ? raw[0] : raw
            acc[key as keyof T] = typeof first === 'string' ? first : JSON.stringify(first)
            return acc
        }, {} as Record<keyof T, string | undefined>)
    }
    return {} as Record<keyof T, string | undefined>
}

type GetFormDataFromObject = <T extends Record<string, (string | Blob | File | number | boolean | null | object | undefined) | (string | Blob | File | number | boolean | null | object | undefined)[]>>(object: T) => FormData

const appendToFormData = (formData: FormData, key: string, value: unknown) => {
    if (value instanceof File || value instanceof Blob) {
        formData.append(key, value)
    } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
            if (item instanceof File || item instanceof Blob) {
                formData.append(`${key}[${index}]`, item)
            } else if (item && typeof item === 'object') {
                Object.entries(item).forEach(([nestedKey, nestedValue]) => {
                    appendToFormData(formData, `${key}[${index}]${nestedKey}`, nestedValue)
                })
            } else if (item !== undefined) {
                formData.append(`${key}[${index}]`, item === null ? '' : item.toString())
            }
        })
    } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            appendToFormData(formData, `${key}.${nestedKey}`, nestedValue)
        })
    } else if (value !== undefined) {
        formData.append(key, value === null ? '' : value.toString())
    }
}

export const getFormDataFromObject: GetFormDataFromObject = (object) => {
    const formData = new FormData()
    Object.entries(object).forEach(([key, value]) => {
        appendToFormData(formData, key, value)
    })
    return formData
}

// export const getTranslatedField = <T>(obj: T, field: keyof T) => {
//     const locale = getLocale()
//     return obj[field]
// }

export const getFileType = (fileName: string) => {
    const fileExtension = fileName.split('.').pop()?.toLowerCase()
    
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp']
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'ico', 'webp', 'svg', 'heic', 'heif']
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', 'ogv']
    const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus']
    const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
    
    if (documentExtensions.includes(fileExtension)) return 'document'
    if (imageExtensions.includes(fileExtension)) return 'image'
    if (videoExtensions.includes(fileExtension)) return 'video'
    if (audioExtensions.includes(fileExtension)) return 'audio'
    if (archiveExtensions.includes(fileExtension)) return 'archive'
    
    return 'other'
}