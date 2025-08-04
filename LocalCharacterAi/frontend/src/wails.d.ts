export {};

declare global{
    interface Window{
        go:{
            main:{
                Chat:{
                    SendMessage(message: string): Promise<string>;
                    GetHistory(): Promise<string>;
                    openNewChat(): Promise <void>;
                }
            }
        }
    }
}