import fs from 'fs';

export const log = (text, file="default.txt", delimiter='\n') => {
    const logText = text + delimiter;
    fs.appendFile(file, logText, 'utf-8', (err) => {
        if(err){
            console.log(err)
        }
    });
}