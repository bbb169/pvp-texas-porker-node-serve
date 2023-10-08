import { AES } from "crypto-js";
import { privateKey } from "./const";

export default function encryptInfo(infomation: any) {
  return AES.encrypt(JSON.stringify(infomation), privateKey).toString();
}