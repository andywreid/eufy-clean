export const DOMAIN = "robovac_mqtt";
export const VACS = "vacs";
export const DEVICES = "devices";

// Eufy API URLs
export const EUFY_API_BASE_URL = "https://api.eufylife.com";
export const EUFY_HOME_API_BASE_URL = "https://home-api.eufylife.com";
export const EUFY_AIOT_API_BASE_URL = "https://aiot-clean-api-pr.eufylife.com";

export const EUFY_API_LOGIN = `${EUFY_HOME_API_BASE_URL}/v1/user/email/login`;
export const EUFY_API_LOGIN_V2 = `${EUFY_HOME_API_BASE_URL}/v1/user/v2/email/login`;
export const EUFY_API_USER_INFO = `${EUFY_API_BASE_URL}/v1/user/user_center_info`;
export const EUFY_API_DEVICE_LIST = `${EUFY_AIOT_API_BASE_URL}/app/devicerelation/get_device_list`;
export const EUFY_API_HOUSE_LIST = `${EUFY_AIOT_API_BASE_URL}/app/house/get_devs_list`;
export const EUFY_API_DEVICE_V2 = `${EUFY_API_BASE_URL}/v1/device/v2`;
export const EUFY_API_DEVICE_LIST_HOME = `${EUFY_HOME_API_BASE_URL}/v1/device/`;
export const EUFY_API_MQTT_INFO = `${EUFY_AIOT_API_BASE_URL}/app/devicemanage/get_user_mqtt_info`;

export const EUFY_DOMAIN_CONFIGS = [
    {
        "label": "v2 (Eufy app)",
        "url": EUFY_API_LOGIN_V2,
        "client_id": "eufy-app",
        "client_secret": "8FHf22gaTKu7MZXqz5zytw",
        "category": "Health",
    },
    {
        "label": "v1 (Eufy Clean app)",
        "url": EUFY_API_LOGIN,
        "client_id": "eufyhome-app",
        "client_secret": "GQCpr9dSp3uQpsOMgJ4xQ",
        "category": "Home",
    },
]