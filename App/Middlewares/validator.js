import joi from 'joi';
import Logger from '../Utils/Logger.js';

class Validator {

    constructor () {
        this.logger = new Logger();
    }

    validate(data, schema) {
        const { error } = joi.object(schema).validate(data);
        if (error) {
            this.logger.error(error.details[0].message);
            throw new Error(error.details[0].message);
        }
    }

}

export default Validator;