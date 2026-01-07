declare module 'backblaze-b2' {
  class B2 {
    constructor(config: {
      applicationKeyId: string
      applicationKey: string
    })
    authorize(): Promise<any>
    getUploadUrl(params: { bucketId: string }): Promise<any>
    uploadFile(params: {
      uploadUrl: string
      uploadAuthToken: string
      fileName: string
      data: Buffer
      mime: string
    }): Promise<any>
    deleteFileVersion(params: {
      fileId: string
      fileName: string
    }): Promise<any>
    listFileVersions(params: {
      bucketId: string
      startFileName?: string
      maxFileCount?: number
    }): Promise<any>
    downloadFileByName(params: {
      bucketName: string
      fileName: string
      responseType?: string
    }): Promise<any>
  }
  export = B2
}

