import axios from 'axios';
import crypto from 'crypto';
import { EUFY_API_DEVICE_LIST, EUFY_API_DEVICE_LIST_HOME, EUFY_API_MQTT_INFO, EUFY_DOMAIN_CONFIGS, EUFY_API_HOUSE_LIST } from '../constants';


export class EufyApi {
    private requestClient: axios.AxiosInstance;
    private username: string;
    private password: string;
    public openudid: string;
    public session: any;
    public userInfo: any;

    constructor(username: string, password: string, openudid: string) {
        this.username = username;
        this.password = password;
        this.openudid = openudid;

        this.requestClient = axios.create();
    }

    public async login(): Promise<any> {
        let session = null;
        try {
            session = await this.eufyLogin(true);
        } catch {
            session = await this.eufyLogin(false);
        }

        const user = await this.getUserinfo();
        const mqtt = await this.getMqttCredentials();

        return { session, user, mqtt };
    }

    public async sofLogin(): Promise<any> {
        let session = null;
        try {
            session = await this.eufyLogin(true);
        } catch {
            session = await this.eufyLogin(false);
        }

        return { session };
    }

    public async eufyLogin(v2?: boolean): Promise<void> {
        const selectedConfig = v2 ? EUFY_DOMAIN_CONFIGS[0] : EUFY_DOMAIN_CONFIGS[1];

        console.info(`Attempting ${selectedConfig.label} login`);
        return await this.requestClient({
            method: 'post',
            url: selectedConfig.url,
            headers: {
                category: selectedConfig.category,
                Accept: '*/*',
                openudid: this.openudid,
                'Accept-Language': 'nl-NL;q=1, uk-DE;q=0.9, en-NL;q=0.8',
                'Content-Type': 'application/json',
                clientType: '1',
                language: 'nl',
                "User-Agent": "EufyHome-Android-3.1.3-753",
                timezone: 'Europe/Berlin',
                country: 'NL',
                Connection: 'keep-alive',
            },
            data: {
                email: this.username,
                password: this.password,
                client_id: selectedConfig.client_id,
                client_secret: selectedConfig.client_secret,
            },
        })
            .then((res) => {
                if (res.data && res.data.access_token) {
                    console.info('eufyLogin successful');

                    this.session = res.data;

                    return res.data;
                } else {
                    console.error('Login failed: ' + JSON.stringify(res.data));
                    return;
                }
            })
            .catch((error) => {
                console.error(error);
                console.error('Login failed');
                error.response && console.error(JSON.stringify(error.response.data));
            });
    }

    public async getUserinfo(): Promise<void> {
        return await this.requestClient({
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.eufylife.com/v1/user/user_center_info',
            headers: {
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'user-agent': 'EufyHome-Android-3.1.3-753',
                timezone: 'Europe/Berlin',
                category: 'Home',
                token: this.session.access_token,
                openudid: this.openudid,
                clienttype: '2',
                language: 'de',
                country: 'DE',
            },
        })
            .then(async (res) => {
                this.userInfo = res.data;
                //md5 hash of userid
                if (!res.data.user_center_id) {
                    console.error('No user_center_id found');
                    return;
                }
                this.userInfo.gtoken = crypto.createHash('md5').update(res.data.user_center_id).digest('hex');

                return res.data;
            })
            .catch((error) => {
                console.error('get user center info failed');
                console.error(error);
                error.response && console.error(JSON.stringify(error.response.data));
            });
    }

    public async getCloudDeviceList(): Promise<string[]> {
        //get general device list
        const devices = await this.requestClient({
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.eufylife.com/v1/device/v2',
            headers: {
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'user-agent': 'EufyHome-Android-3.1.3-753',
                timezone: 'Europe/Berlin',
                category: 'Home',
                token: this.session.access_token,
                openudid: this.openudid,
                clienttype: '2',
                language: 'nl',
                country: 'NL',
            },
        })
            .then(async (res) => {
                let data = res.data;

                if (res.data.data) {
                    data = res.data.data;
                }

                console.info(`Found ${data?.devices?.length || 0} devices via Eufy Cloud`);
                console.debug(JSON.stringify(data, null, 2));
                return data?.devices || [];
            })
            .catch((error) => {
                console.error('get device list failed');
                console.error(error);
                error.response && console.error(JSON.stringify(error.response.data));
                return [];
            });

        console.log(`got ${devices.length} devices`);
        // Fallback: accounts whose devices were registered through the modern
        // unified Eufy app are not always returned by /v1/device/v2. Try the
        // home-api endpoint before giving up. (mirrors jeppesens/eufy-clean#122)
        if (!devices || !devices.length) {
            const homeDevices = await this.getHomeDeviceList();
            if (homeDevices.length) {
                console.info(`Found ${homeDevices.length} devices via Eufy home-api`);
                return homeDevices;
            } else {
                console.info(`Found ${homeDevices.length} devices via Eufy home-api`);
            }
        }

        return devices || [];
    }

    // home-api.eufylife.com device list used by the unified Eufy app. Best-effort:
    // never throws, returns [] on any failure. Response shape varies, so probe a
    // few known structures. (mirrors jeppesens/eufy-clean#122 _get_home_device_list)
    private async getHomeDeviceList(): Promise<any[]> {
        return await this.requestClient({
            method: 'get',
            maxBodyLength: Infinity,
            url: EUFY_API_HOUSE_LIST,
            headers: {
                'content-type': 'application/json',
                'user-agent': 'EufyHome-Android-3.1.3-753',
                token: this.session.access_token,
                openudid: this.openudid,
            },
        })
            .then((res) => {
                const data = res.data;
                let devices = data?.devices ?? data?.data ?? data;
                if (devices && !Array.isArray(devices) && Array.isArray(devices.devices)) {
                    devices = devices.devices;
                }
                return Array.isArray(devices) ? devices : [];
            })
            .catch((error) => {
                console.error('get home-api device list failed');
                error.response && console.error(JSON.stringify(error.response.data));
                return [];
            });
    }

    public async getDeviceList(device_sn?: string): Promise<any> {
        const devices = await this.requestClient({
            method: 'post',
            maxBodyLength: Infinity,
            url: EUFY_API_DEVICE_LIST,
            headers: {
                'user-agent': 'EufyHome-Android-3.1.3-753',
                timezone: 'Europe/Berlin',
                openudid: this.openudid,
                language: 'de',
                country: 'DE',
                'os-version': 'Android',
                'model-type': 'PHONE',
                'app-name': 'eufy_home',
                'x-auth-token': this.userInfo.user_center_token,
                gtoken: this.userInfo.gtoken,
                'content-type': 'application/json; charset=UTF-8',
            },
            data: { attribute: 3 },
        })
            .then(async (res) => {

                const deviceArray = [];

                let data = res.data;

                if (res.data.data) {
                    data = res.data.data;
                }

                if (data.devices) {
                    for (const deviceObject of data.devices) {
                        deviceArray.push(deviceObject.device);
                    }

                    if (device_sn?.length) {
                        return deviceArray.find((device: any) => device.device_sn === device_sn);
                    }
                }

                console.info(`Found ${deviceArray.length} devices via Eufy MQTT`);

                return deviceArray;
            })
            .catch((error) => {
                console.error('update device failed');
                console.error(error);
                error.response && console.error(JSON.stringify(error.response.data));
            });

        return devices;
    }


    async getDeviceProperties(deviceModel: string): Promise<void> {
        const base64 = [];
        const base64ToHex = [];
        await this.requestClient({
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://aiot-clean-api-pr.eufylife.com/app/things/get_product_data_point',
            headers: {
                'user-agent': 'EufyHome-Android-3.1.3-753',
                timezone: 'Europe/Berlin',
                openudid: this.openudid,
                language: 'de',
                country: 'DE',
                'os-version': 'Android',
                'model-type': 'PHONE',
                'app-name': 'eufy_home',
                'x-auth-token': this.userInfo.user_center_token,
                gtoken: this.userInfo.gtoken,
                'content-type': 'application/json; charset=UTF-8',
            },
            data: { code: deviceModel },
        })
            .then(async (res) => {
                console.debug(JSON.stringify(res.data, null, 2));
                // if (res.data.data && res.data.data.data_point_list) {
                //   this.dataPoints[currentModel] = res.data.data.data_point_list;
                //   for (const dataPoint of res.data.data.data_point_list) {
                //     this.descriptions[dataPoint.dp_id] = dataPoint.code;
                //     if (dataPoint.data_type === 'String') {
                //       base64.push(dataPoint.dp_id);
                //     }
                //     if (dataPoint.data_type === 'Raw') {
                //       base64ToHex.push(dataPoint.dp_id.toString());
                //     }
                //   }
                // }
            })

            .catch((error) => {
                console.error('get product data point failed');
                console.error(error);
                error.response && console.error(JSON.stringify(error.response.data));
            });
    }


    public async getMqttCredentials(): Promise<void> {
        return await this.requestClient({
            method: 'post',
            maxBodyLength: Infinity,
            url: EUFY_API_MQTT_INFO,
            headers: {
                'content-type': 'application/json',
                'user-agent': 'EufyHome-Android-3.1.3-753',
                timezone: 'Europe/Berlin',
                openudid: this.openudid,
                language: 'de',
                country: 'DE',
                'os-version': 'Android',
                'model-type': 'PHONE',
                'app-name': 'eufy_home',
                'x-auth-token': this.userInfo.user_center_token,
                gtoken: this.userInfo.gtoken,
            },
        })
            .then(async (res) => {
                return res.data.data;
            })
            .catch((error) => {
                console.error('get mqtt failed');
                console.error(error);
                error.response && console.error(JSON.stringify(error.response.data));
            });
    }
}
