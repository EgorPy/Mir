const userStates = {}

export function setUserState(key, value) {
    userStates[key] = value
}

export function getUserState(key) {
    return userStates[key]
}

export function getUserStates() {
    return userStates
}
