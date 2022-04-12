import { UserData } from '../database/definitions';

export default class UserUtils {
  static isAdmin(userId) {
    let user = UserData.findOne(userId);

    if (!!user && user.role === 'researcher') return true;
    else return false;
  }

  static isStudent(userId) {
    let user = UserData.findOne(userId);

    if (!!user && user.role === 'student') return true;
    else return false;
  }
}