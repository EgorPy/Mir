import { getUserId } from '../fetch/get_user_id.js'
import { getChatsRole } from '../fetch/get_chats_role.js'
import { getUserState, setUserState } from '../state/user_state.js'

export async function fetchUserData() {
    const userId = await getUserId()
    const chatsRole = await getChatsRole()
    setUserState("user_id", userId)
    setUserState("chats_role", chatsRole)
}
